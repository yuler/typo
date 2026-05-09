module Ai
  class Completion
    DEFAULT_SYSTEM_PROMPT = <<~PROMPT.freeze
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
    def self.perform(text:, system_prompt: DEFAULT_SYSTEM_PROMPT)
      new(text: text, system_prompt: system_prompt).perform
    end

    def initialize(text:, system_prompt: DEFAULT_SYSTEM_PROMPT)
      @text = text
      @system_prompt = system_prompt
    end

    def perform
      chat = RubyLLM.chat
        # TODO: this config don't work
        .with_params(
          thinking: { type: "disabled" },
          # reasoning_effort: "high",
          stream: false
        )
      response = chat.with_instructions(@system_prompt).ask("###\n#{@text}\n###")
      Rails.logger.info response.to_json
      response.content
    end
  end
end
