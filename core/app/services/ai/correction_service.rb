module Ai
  class CorrectionService
    def self.call(text, system_prompt = nil)
      new(text, system_prompt).call
    end

    def initialize(text, system_prompt)
      @text = text
      @system_prompt = system_prompt
    end

    def call
      # For now, return a placeholder. Actual AI integration would go here.
      "AI Corrected: #{@text}"
    end
  end
end
