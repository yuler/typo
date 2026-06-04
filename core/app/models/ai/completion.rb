module Ai
  Result = Struct.new(:content, :tokens, :model_id, :duration_ms, :status)

  class Completion
    include ActiveModel::Model
    include ActiveModel::Attributes

    DEFAULT_PROMPT = "You are Typo assistant.".freeze

    MAX_TEXT_LENGTH = 2048

    attribute :text, :string
    attribute :prompt, :string, default: -> { DEFAULT_PROMPT }

    validates :text, presence: true, length: { maximum: MAX_TEXT_LENGTH }

    def initialize(attributes = {})
      super
      self.prompt = prompt.presence || DEFAULT_PROMPT
    end

    def perform
      return unless valid?

      start_time = Time.current
      chat = RubyLLM.chat
        .with_params(thinking: { type: "disabled" }, stream: false)
      # Note: I will test it later.
      # .with_params(  thinking: { type: "enabled" }, reasoning_effort: "high" )
      response = chat.with_instructions(prompt).ask(text)
      duration_ms = ((Time.current - start_time) * 1000).to_i

      Rails.logger.info({ model: chat.model.id, prompt: prompt, text: text, output: response.content, tokens: response.tokens, cost: response.cost&.total }.to_json)

      Result.new(
        response.content,
        response.tokens,
        chat.model.id,
        duration_ms,
        "success"
      )
    end
  end
end
