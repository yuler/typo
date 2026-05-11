require "test_helper"

class Ai::CompletionTest < ActiveSupport::TestCase
  setup do
    if ENV["CI"] || ENV["DEEPSEEK_API_KEY"].blank?
      skip "Skipping AI test due to missing DEEPSEEK_API_KEY environment variable or CI environment"
    end
  end

  test "Translate to English with default system prompt" do
    text = "你好，世界。"
    result = Ai::Completion.perform(text: text)
    assert_equal "Hello, world.", result
  end

  test "Translate to Janpanese" do
    text = "你好，世界。"
    system_prompt = <<~PROMPT.freeze
      Translate to Janpanese
    PROMPT
    result = Ai::Completion.perform(text: text, system_prompt: system_prompt)
    assert_equal "こんにちは、世界。", result
  end

  test "Translate to Chinese" do
    text = "Hello, world."
    system_prompt = <<~PROMPT.freeze
      Translate to Chinese
    PROMPT
    result = Ai::Completion.perform(text: text, system_prompt: system_prompt)
    assert_equal "你好，世界。", result
  end
end
