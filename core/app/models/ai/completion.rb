module Ai
  class Completion
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
    def self.perform(text:, prompt: DEFAULT_PROMPT)
      new(text: text, prompt: prompt).perform
    end

    def initialize(text:, prompt: DEFAULT_PROMPT)
      @text = text
      @prompt = prompt
    end

    def perform
      # Note: this is just for test
      if @text == "__fake_test_text__" && Rails.env.test?
        return "__success__"
      end

      chat = RubyLLM.chat
        .with_params(thinking: { type: "disabled" }, stream: false)
      # Note: I will test it later.
      # .with_params(  thinking: { type: "enabled" }, reasoning_effort: "high" )
      response = chat.with_instructions(@prompt).ask("###\n#{@text}\n###")

      Rails.logger.info({ model: chat.model.id, prompt: @prompt, text: @text, output: response.content, tokens: response.tokens, cost: response.cost.total }.to_json)

      response.content
    end
  end
end
