class SlashPrompt < ApplicationRecord
  belongs_to :account

  serialize :aliases, coder: JSON

  validates :key, presence: true, format: { with: /\A\/\w+\z/, message: "must start with / and contain only letters/digits/underscores" }
  validates :value, presence: true
  validates :key, uniqueness: { scope: :account_id, message: "already exists for this account" }

  validate :validate_aliases_format
  validate :validate_triggers_unique_across_account_prompts

  before_validation :normalize_aliases

  DEFAULT_SLASH_COMMANDS = [
    {
      key: "/prompt",
      aliases: [ "/p" ],
      value: "Treat the slash line arguments and remaining selection together: infer the user's intent from both and rewrite or transform the material accordingly. Return only the output text with no preamble or explanation."
    },
    { key: "/zh", aliases: [ "/cn" ], value: "Translate the input text into Simplified Chinese while preserving meaning. Return only translated text." },
    { key: "/jp", aliases: [ "/ja" ], value: "Translate the input text into Japanese while preserving meaning. Return only translated text." },
    {
      key: "/ph",
      aliases: [ "/py" ],
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
      account.slash_prompts.create!(key: cmd[:key], value: cmd[:value], aliases: cmd[:aliases])
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

  def validate_triggers_unique_across_account_prompts
    return if account_id.blank? || key.blank?

    identifiers = ([ key ] + Array(aliases)).compact.uniq
    scope = SlashPrompt.where(account_id: account_id)
    scope = scope.where.not(id: id) if persisted?

    scope.find_each do |other|
      other_ids = ([ other.key ] + Array(other.aliases)).compact.uniq
      collision = identifiers & other_ids
      next if collision.empty?

      errors.add(:base, "trigger '#{collision.first}' is already used by another slash prompt (#{other.key})")
      break
    end
  end
end
