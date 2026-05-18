module Ai
  Result = Struct.new(:content, :tokens, :model_id, :duration_ms, :status)

  class Completion
    include ActiveModel::Model
    include ActiveModel::Attributes

    DEFAULT_PROMPT = <<~PROMPT.freeze
      You are Typo's system assistant.

      Role:
      You will be a professional English editor and translator. Your job is to provide natural, idiomatic, and error-free English versions of the input text.

      Core Tasks:
      1. Translate Chinese to native English or polish existing English.
      2. Correct grammar, spelling, and punctuation.
      3. Enhance flow and readability while preserving original meaning and tone.

      Rules:
      - Output ONLY the improved text. No explanations, notes, or commentary.
      - Maintain original formatting, technical terms, and proper names.
      - Adapt style (formal/casual) to match the context.

      Input Format:
      Text will be provided between ### markers.
    PROMPT

    MAX_TEXT_LENGTH = 100

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
      response = chat.with_instructions(prompt).ask("###\n#{text}\n###")
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
