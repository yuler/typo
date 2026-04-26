# Multi-Tenancy (URL-Based) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a path-based multi-tenant system with magic link authentication and identity-based sessions in a Rails 8 monolith.

**Architecture:** Uses a flat-slug routing pattern (`/slug/`) powered by middleware that extracts the slug and manipulates `SCRIPT_NAME` (Fizzy pattern). Authentication is passwordless, using `MagicLink` codes to create `Session` records.

**Tech Stack:** Rails 8, SQLite, ActiveSupport::CurrentAttributes, Custom Middleware.

---

### Task 1: Foundations (UUID & Current Attributes)

**Files:**
- Create: `app/models/concerns/has_base36_uuid.rb`
- Create: `app/models/current.rb`
- Modify: `app/models/application_record.rb`

- [ ] **Step 1: Create Base36 UUID Concern**
  Implement the logic to use UUIDv7 encoded as base36 for primary keys.

```ruby
module HasBase36Uuid
  extend ActiveSupport::Concern

  included do
    self.primary_key = :id
    before_create :generate_base36_uuid
  end

  private

  def generate_base36_uuid
    self.id ||= PreciseId.generate if self.class.primary_key == "id"
  end
end
```
*Note: Check if `PreciseId` or similar exists in the codebase first. If not, use `SecureRandom.alphanumeric(25).downcase`.*

- [ ] **Step 2: Create Current Attributes**
  Define global request context.

```ruby
class Current < ActiveSupport::CurrentAttributes
  attribute :identity, :account, :user, :session
end
```

- [ ] **Step 3: Update ApplicationRecord**
  Include the UUID concern by default.

```ruby
class ApplicationRecord < ActiveRecord::Base
  primary_abstract_class
  include HasBase36Uuid
end
```

- [ ] **Step 4: Commit**
```bash
git add app/models/concerns/has_base36_uuid.rb app/models/current.rb app/models/application_record.rb
git commit -m "infra: add base36 uuid support and Current context"
```

---

### Task 2: Database Schema & Models

**Files:**
- Create: `db/migrate/..._create_multi_tenancy_tables.rb`
- Create: `app/models/identity.rb`, `app/models/account.rb`, `app/models/user.rb`, `app/models/session.rb`, `app/models/magic_link.rb`

- [ ] **Step 1: Create Migration**
  Define tables with string IDs (for base36 UUIDs).

```ruby
class CreateMultiTenancyTables < ActiveRecord::Migration[8.0]
  def change
    create_table :identities, id: :string, limit: 25 do |t|
      t.string :email, null: false, index: { unique: true }
      t.timestamps
    end

    create_table :accounts, id: :string, limit: 25 do |t|
      t.string :name, null: false
      t.string :slug, null: false, index: { unique: true }
      t.boolean :personal, default: true, null: false
      t.timestamps
    end

    create_table :users, id: :string, limit: 25 do |t|
      t.string :identity_id, null: false, index: true
      t.string :account_id, null: false, index: true
      t.string :role, null: false
      t.timestamps
    end

    create_table :sessions, id: :string, limit: 25 do |t|
      t.string :identity_id, null: false, index: true
      t.string :token, null: false, index: { unique: true }
      t.string :ip_address
      t.string :user_agent
      t.datetime :last_active_at
      t.timestamps
    end

    create_table :magic_links, id: :string, limit: 25 do |t|
      t.string :identity_id, null: false, index: true
      t.string :code, null: false, index: { unique: true }
      t.datetime :expires_at, null: false
      t.datetime :used_at
      t.timestamps
    end
  end
end
```

- [ ] **Step 2: Define Models**
  Add basic associations and validations.

```ruby
# app/models/identity.rb
class Identity < ApplicationRecord
  has_many :users
  has_many :accounts, through: :users
  has_many :sessions
  validates :email, presence: true, format: { with: URI::MailTo::EMAIL_REGEXP }
end

# app/models/account.rb
class Account < ApplicationRecord
  has_many :users
  has_many :identities, through: :users
  validates :slug, presence: true, uniqueness: true, format: { with: /\A[a-z0-9-]+\z/ }
end

# app/models/user.rb
class User < ApplicationRecord
  belongs_to :identity
  belongs_to :account
  enum :role, { owner: "owner", admin: "admin", member: "member" }, default: "member"
end
```

- [ ] **Step 3: Run Migration**
```bash
bin/rails db:migrate
```

- [ ] **Step 4: Commit**
```bash
git add db/migrate app/models
git commit -m "feat: add multi-tenancy models and migrations"
```

---

### Task 3: Magic Link Authentication

**Files:**
- Modify: `app/models/magic_link.rb`
- Create: `app/controllers/magic_links_controller.rb`

- [ ] **Step 1: Implement MagicLink Logic**
  Add generation and expiration logic.

```ruby
class MagicLink < ApplicationRecord
  belongs_to :identity
  
  before_validation(on: :create) do
    self.code ||= SecureRandom.alphanumeric(6).upcase
    self.expires_at ||= 15.minutes.from_now
  end

  def expired?
    expires_at < Time.current
  end

  def used?
    used_at.present?
  end
end
```

- [ ] **Step 2: Create Controller**
  Handle sending the email (stubbed for now) and showing the verification form.

```ruby
class MagicLinksController < ApplicationController
  def new
  end

  def create
    identity = Identity.find_or_create_by!(email: params[:email])
    magic_link = identity.magic_links.create!
    # MagicLinkMailer.login(magic_link).deliver_later
    render :sent
  end
end
```

- [ ] **Step 3: Commit**
```bash
git add app/models/magic_link.rb app/controllers/magic_links_controller.rb
git commit -m "feat: implement magic link generation"
```

---

### Task 4: Session Management & Verification

**Files:**
- Modify: `app/controllers/sessions_controller.rb`
- Modify: `app/models/session.rb`

- [ ] **Step 1: Implement Verification Logic**
  Verify the code, create the session, and handle solo account creation.

```ruby
class SessionsController < ApplicationController
  def create
    magic_link = MagicLink.find_by(code: params[:code])

    if magic_link&.expired? || magic_link&.used?
      return redirect_to new_magic_link_path, alert: "Invalid or expired code."
    end

    identity = magic_link.identity
    magic_link.update!(used_at: Time.current)

    # Solo Account Creation Logic
    account = identity.accounts.find_by(personal: true)
    unless account
      slug = identity.email.split("@").first.parameterize + "-" + SecureRandom.hex(2)
      account = Account.create!(name: identity.email.split("@").first, slug: slug, personal: true)
      identity.users.create!(account: account, role: :owner)
    end

    session = identity.sessions.create!(
      token: SecureRandom.hex(32),
      ip_address: request.remote_ip,
      user_agent: request.user_agent,
      last_active_at: Time.current
    )
    
    cookies.signed[:session_token] = { value: session.token, httponly: true, secure: Rails.env.production? }
    redirect_to "/#{account.slug}/"
  end
end
```

- [ ] **Step 2: Commit**
```bash
git add app/controllers/sessions_controller.rb
git commit -m "feat: implement session verification and solo account onboarding"
```

---

### Task 5: Multi-Tenancy Middleware (Slug Extractor)

**Files:**
- Create: `lib/account_slug/extractor.rb`
- Modify: `config/application.rb`

- [ ] **Step 1: Create Middleware**
  Extract slug from `PATH_INFO` and move it to `SCRIPT_NAME`.

```ruby
module AccountSlug
  class Extractor
    RESERVED_SLUGS = %w[admin api assets billing dashboard help jobs login logout magic_link rails settings setup static support typo session]

    def initialize(app)
      @app = app
    end

    def call(env)
      request = Rack::Request.new(env)
      path_parts = request.path_info.split("/")
      first_part = path_parts[1]

      if first_part.present? && !RESERVED_SLUGS.include?(first_part)
        env["SCRIPT_NAME"] = "/#{first_part}"
        env["PATH_INFO"] = "/" + path_parts[2..].join("/")
        env["typo.account_slug"] = first_part
      end

      @app.call(env)
    end
  end
end
```

- [ ] **Step 2: Register Middleware**
```ruby
config.middleware.use AccountSlug::Extractor
```

- [ ] **Step 3: Commit**
```bash
git add lib/account_slug/extractor.rb config/application.rb
git commit -m "feat: add account slug extractor middleware"
```

---

### Task 6: Routing & Authentication Guards

**Files:**
- Modify: `app/controllers/application_controller.rb`
- Modify: `config/routes.rb`

- [ ] **Step 1: ApplicationController Resolution**
  Resolve `Current.account` and `Current.identity` from session and middleware.

```ruby
class ApplicationController < ActionController::Base
  before_action :authenticate_identity
  before_action :resolve_account

  private

  def authenticate_identity
    if (session_record = Session.find_by(token: cookies.signed[:session_token]))
      Current.session = session_record
      Current.identity = session_record.identity
      session_record.touch(:last_active_at)
    end
  end

  def resolve_account
    if (slug = request.env["typo.account_slug"])
      Current.account = Account.find_by!(slug: slug)
      Current.user = Current.identity&.users&.find_by!(account: Current.account)
    end
  rescue ActiveRecord::RecordNotFound
    render plain: "Not Found or Access Denied", status: :not_found
  end
end
```

- [ ] **Step 2: Define Routes**
  Configure system routes and root.

```ruby
Rails.application.routes.draw do
  resource :session, only: [:new, :create, :destroy]
  resource :magic_link, only: [:new, :create]
  
  # Dashboard is now at the "root" of the mounted slug
  root to: "dashboards#show"
end
```

- [ ] **Step 3: Commit**
```bash
git add app/controllers/application_controller.rb config/routes.rb
git commit -m "feat: finalize routing and multi-tenant resolution"
```
