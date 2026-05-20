# Server-side Prompts Migration and Sync Specification

This design document outlines the transition of slash command prompts from local desktop storage to the Rails core server, enabling persistent settings across devices, default prompt generation on signup onboarding, and seamless migration for existing users.

---

## Architecture Overview

```mermaid
graph TD
    subgraph Client [Desktop Client (Vue 3 / Tauri)]
        UI[PromptsSettings.vue] -->|store.set| Settings[settings.ts Store]
        UI -->|store.get| Settings
        Settings -->|sync| Sync[syncPromptsWithServer]
        Sync -->|server empty?| Migration[prompts_migration.ts]
        Migration -->|POST /api/v1/prompts| API
        Sync -->|overwrite local| Settings
    end

    subgraph Server [Core Server (Rails 8 / SQLite)]
        API[Api::V1::PromptsController] -->|reads/writes| Prompt[Prompt Model]
        Prompt -->|belongs_to| Account[Account Model]
        Onboarding[Account.create_with_owner] -->|after create| Prompt
    end
```

---

## 1. Backend Design

We will create a `Prompt` model on the Rails `core` server that is associated with `Account`. We will use UUIDs for all primary/foreign keys and skip database-level foreign key constraints to remain consistent with the existing codebase pattern.

### 1.1 Database Migration (`core/db/migrate/20260520000000_create_prompts.rb`)
```ruby
class CreatePrompts < ActiveRecord::Migration[8.2]
  def change
    create_table :prompts, id: :uuid do |t|
      t.uuid :account_id, null: false
      t.string :key, null: false
      t.text :value, null: false
      t.string :aliases, default: "[]" # Serialized JSON array of strings

      t.timestamps
    end

    add_index :prompts, :account_id
    add_index :prompts, [:account_id, :key], unique: true
  end
end
```

### 1.2 Model Definition (`core/app/models/prompt.rb`)
```ruby
class Prompt < ApplicationRecord
  belongs_to :account

  # Serialize aliases as JSON array
  serialize :aliases, type: JSON, coder: JSON

  validates :key, presence: true, format: { with: /\A\/\w+\z/, message: "must start with / and contain only letters/digits/underscores" }
  validates :value, presence: true
  validates :key, uniqueness: { scope: :account_id, message: "already exists for this account" }

  validate :validate_aliases_format
  before_validation :normalize_aliases

  # Default slash commands for signup onboarding
  DEFAULT_SLASH_COMMANDS = [
    { key: "/prompt", aliases: ["/p"], value: "Follow this instruction: \n{{args}}\nThe input text is: \n{{text}}\nReturn only the result." },
    { key: "/zh", aliases: ["/cn"], value: "Translate the input text into Simplified Chinese while preserving meaning. Return only translated text." },
    { key: "/jp", aliases: ["/ja"], value: "Translate the input text into Japanese while preserving meaning. Return only translated text." },
    {
      key: "/ph",
      aliases: ["/py"],
      value: <<~PROMPT.strip
        # 任务：多语种自动注音与视觉对齐
        你是一个专业的注音标注助手。请根据输入文本的语种（日语、中文或英语），自动执行以下转换逻辑：

        ### 核心规则：
        1. **立即判定**：接收到文本后，首先判断其语种。
        2. **两行输出**：必须且仅返回两行结果，严禁输出任何解释或额外文字。
           - **第一行**：注音层。
             - 日语：小写罗马字（Romaji），逐假名对齐。
             - 中文：带声调拼音（Pinyin），逐字对齐。
             - 英语：**IPA 国际音标**，逐词对齐。
           - **第二行**：原文层。
        3. **严格对齐**：使用下划线 `_` 填充，确保第一行的注音符号与其下方的原文块在视觉上精确上下对齐。

        ### 示例参考：

        **输入**：Hello world
        **输出**：
        həˈloʊ___wɜrld
        Hello____world

        **输入**：我爱学习
        **输出**：
        wǒ_____ài____xué_xí
        我_____爱____学__习

        **输入**：君は勉強する
        **输出**：
        ki_mi___wa___be_n_kyo_u___su_ru
        君______は___勉___強_______す_る

        ---

        请对接下来输入的任何内容执行上述转换。
      PROMPT
    }
  ].freeze

  def self.create_defaults_for!(account)
    DEFAULT_SLASH_COMMANDS.each do |cmd|
      account.prompts.create!(key: cmd[:key], value: cmd[:value], aliases: cmd[:aliases])
    end
  end

  private

  def normalize_aliases
    self.aliases = Array(aliases).map(&:to_s).map(&:strip).reject(&:empty?)
  end

  def validate_aliases_format
    unless aliases.is_a?(Array)
      errors.add(:aliases, "must be an array")
      return
    end

    aliases.each do |alias_key|
      unless alias_key.match?(/\A\/\w+\z/)
        errors.add(:aliases, "contains invalid alias '#{alias_key}'. Each alias must start with / and contain only letters/digits/underscores")
      end
    end
  end
end
```

### 1.3 Signup Onboarding (`core/app/models/account.rb`)
```ruby
class Account < ApplicationRecord
  has_many :prompts, dependent: :destroy
  # ...

  class << self
    def create_with_owner(account:, owner:)
      create!(**account).tap do |account|
        account.users.create!(role: :system, name: "System")
        account.users.create!(**owner.with_defaults(role: :owner, verified_at: Time.current))
        
        # Automatically generate default prompts on signup onboarding
        Prompt.create_defaults_for!(account)
      end
    end
  end
end
```

### 1.4 API Routing & Controller

#### Routes (`core/config/routes.rb`)
```ruby
namespace :api do
  namespace :v1, defaults: { format: :json } do
    resources :prompts, only: %i[ index create update destroy ]
    # ...
  end
end
```

#### Controller (`core/app/controllers/api/v1/prompts_controller.rb`)
```ruby
class Api::V1::PromptsController < Api::V1::BaseController
  before_action :set_prompt, only: %i[ update destroy ]

  # GET /api/v1/prompts
  def index
    @prompts = Current.account.prompts.order(:created_at)
  end

  # POST /api/v1/prompts
  def create
    @prompt = Current.account.prompts.build(prompt_params)

    if @prompt.save
      render :show, status: :created
    else
      render json: { errors: @prompt.errors.full_messages }, status: :unprocessable_entity
    end
  end

  # PATCH/PUT /api/v1/prompts/:id
  def update
    if @prompt.update(prompt_params)
      render :show
    else
      render json: { errors: @prompt.errors.full_messages }, status: :unprocessable_entity
    end
  end

  # DELETE /api/v1/prompts/:id
  def destroy
    @prompt.destroy
    head :no_content
  end

  private

  def set_prompt
    @prompt = Current.account.prompts.find(params[:id])
  end

  def prompt_params
    params.require(:prompt).permit(:key, :value, aliases: [])
  end
end
```

### 1.5 Jbuilder View Templates
- `core/app/views/api/v1/prompts/_prompt.json.jbuilder`:
  ```ruby
  json.extract! prompt, :id, :key, :value, :aliases, :created_at, :updated_at
  ```
- `core/app/views/api/v1/prompts/index.json.jbuilder`:
  ```ruby
  json.array! @prompts, partial: "api/v1/prompts/prompt", as: :prompt
  ```
- `core/app/views/api/v1/prompts/show.json.jbuilder`:
  ```ruby
  json.partial! "api/v1/prompts/prompt", prompt: @prompt
  ```

---

## 2. Desktop Client Design

We will encapsulate all sync, diffing, and local fallback/offline behavior inside the settings store `settings.ts` and a dedicated migration helper `prompts_migration.ts` to keep concerns perfectly separated.

### 2.1 Isolated Migration Helper (`apps/desktop/src/stores/prompts_migration.ts`)
This helper implements the migration strategy. It is triggered only when a logged-in user retrieves an empty list `[]` of prompts from the server, indicating they are an older user whose settings need uploading.

```typescript
import { api } from '@/api'
import { logger } from '@/logger'
import * as authStore from './auth'
import * as settingsStore from './settings'

/**
 * Handles one-time migration for older users whose accounts have no prompts on the server.
 * Returns true if a migration was executed, false if already migrated or skipped.
 * 
 * TODO: Remove this file entirely in v2.0 once all legacy users are migrated.
 */
export async function runPromptsMigration(serverPrompts: any[]): Promise<boolean> {
  if (serverPrompts.length > 0) {
    return false
  }

  const token = await authStore.getAuth('access_token')
  if (!token) return false

  try {
    logger.info('prompts_migration', 'Starting one-time local prompts migration to server.')

    const localPrompts = await settingsStore.get('slash_commands')

    const uploadedPrompts: any[] = []
    for (const localPrompt of localPrompts) {
      const created = await api<any>('/api/v1/prompts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          key: localPrompt.key,
          value: localPrompt.value,
          aliases: localPrompt.aliases || [],
        }),
      })
      uploadedPrompts.push(created)
    }

    await settingsStore.store.set('slash_commands', uploadedPrompts)
    await settingsStore.store.save()

    logger.info('prompts_migration', 'Local prompts migration completed successfully.')
    return true
  }
  catch (error) {
    logger.error('prompts_migration', 'Failed to run prompts migration', error)
    return false
  }
}
```

### 2.2 Main Settings Store Integration (`apps/desktop/src/stores/settings.ts`)

#### Adding Sync & Reset Methods
```typescript
import { api } from '@/api'
import * as authStore from './auth'

export async function syncPromptsWithServer() {
  const token = await authStore.getAuth('access_token')
  if (!token) return

  try {
    const serverPrompts = await api<SlashCommand[]>('/api/v1/prompts', {
      headers: { Authorization: `Bearer ${token}` },
    })

    const { runPromptsMigration } = await import('./prompts_migration')
    const migrated = await runPromptsMigration(serverPrompts)

    if (!migrated) {
      await store.set('slash_commands', serverPrompts)
      await store.save()
    }
  }
  catch (error) {
    logger.error('store', 'Failed to sync prompts with server', error)
  }
}

export async function resetLocalPrompts() {
  await store.set('slash_commands', DEFAULT_SLASH_COMMANDS)
  await store.save()
}
```

#### Settings `set` Interceptor with Diff Sync
```typescript
export async function set<T extends keyof typeof DEFAULT_STORE>(key: T, value: typeof DEFAULT_STORE[T] | undefined): Promise<void> {
  logger.info('store', `set ${key}`)
  await store.set(key, value)

  if (key === 'slash_commands' && value) {
    const token = await authStore.getAuth('access_token')
    if (token) {
      await syncSlashCommandsToServer(value as SlashCommand[], token)
    }
  }
}

async function syncSlashCommandsToServer(newCommands: SlashCommand[], token: string) {
  try {
    const serverPrompts = await api<SlashCommand[]>('/api/v1/prompts', {
      headers: { Authorization: `Bearer ${token}` },
    })

    const serverPromptMap = new Map(serverPrompts.map(p => [p.id, p]))
    const newCommandMap = new Map(newCommands.map(c => [c.id, c]))

    // 1. DELETE prompts removed in UI
    for (const serverPrompt of serverPrompts) {
      if (serverPrompt.id && !newCommandMap.has(serverPrompt.id)) {
        await api(`/api/v1/prompts/${serverPrompt.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        })
      }
    }

    // 2. CREATE or UPDATE prompts
    const syncedCommands: SlashCommand[] = []
    for (const newCommand of newCommands) {
      const existingServerPrompt = newCommand.id ? serverPromptMap.get(newCommand.id) : null

      if (existingServerPrompt) {
        const hasChanged = existingServerPrompt.key !== newCommand.key
          || existingServerPrompt.value !== newCommand.value
          || JSON.stringify(existingServerPrompt.aliases) !== JSON.stringify(newCommand.aliases)

        if (hasChanged) {
          const updated = await api<SlashCommand>(`/api/v1/prompts/${newCommand.id}`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              key: newCommand.key,
              value: newCommand.value,
              aliases: newCommand.aliases || [],
            }),
          })
          syncedCommands.push(updated)
        }
        else {
          syncedCommands.push(existingServerPrompt)
        }
      }
      else {
        const created = await api<SlashCommand>('/api/v1/prompts', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            key: newCommand.key,
            value: newCommand.value,
            aliases: newCommand.aliases || [],
          }),
        })
        syncedCommands.push(created)
      }
    }

    await store.set('slash_commands', syncedCommands)
    await store.save()
  }
  catch (error) {
    logger.error('store', 'Failed to save prompts to server', error)
    throw error
  }
}
```

### 2.3 Authentication Triggers (`apps/desktop/src/composables/useAuth.ts`)

- **On Startup (`initialize` method)**:
  Perform initial sync on boot if already logged in:
  ```typescript
  // Inside initialize()
  if (token && userEmail) {
    // ...
    const { syncPromptsWithServer } = await import('@/stores/settings')
    await syncPromptsWithServer()
  }
  ```

- **On Successful Login (`onSuccess` method)**:
  ```typescript
  // Inside onSuccess()
  await authStore.saveAuth()
  
  const { syncPromptsWithServer } = await import('@/stores/settings')
  await syncPromptsWithServer()
  
  startHeartbeat()
  ```

- **On Logout/Reset (`reset` method)**:
  ```typescript
  // Inside reset()
  await authStore.saveAuth()
  
  const { resetLocalPrompts } = await import('@/stores/settings')
  await resetLocalPrompts()
  ```

---

## 3. Verification & Testing Plan

### 3.1 Backend Tests
- Add a model spec `core/test/models/prompt_test.rb` to verify key validations, alias format validations, and the signup callback.
- Add an API integration spec `core/test/controllers/api/v1/prompts_controller_test.rb` to test index, create, update, and destroy actions under authentication.

### 3.2 Manual QA Flows
1. **New User Path**: Sign up a new user on the Rails app -> Verify prompts table is populated with 4 defaults -> Log in to desktop app -> Verify client fetches and displays these prompts.
2. **Older User Migration Path**:
   - Manually clear server prompts for an account.
   - Set custom slash commands locally in the desktop app's `settings.json`.
   - Log in to the desktop app -> Verify migration starts, uploads all custom commands, and saves their UUIDs in `settings.json`.
   - Verify server DB prompts list matches the uploaded local settings.
3. **Crud Syncing**:
   - Edit, delete, and add prompts in `PromptsSettings.vue` and click Save.
   - Verify correct POST/PATCH/DELETE API calls are dispatched.
   - Verify local `settings.json` is updated with DB server UUIDs.
