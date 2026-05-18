require "test_helper"

class Ai::CompletionTest < ActiveSupport::TestCase
  # Note: these tests only run locally.
  setup do
    if ENV["CI"] || ENV["DEEPSEEK_API_KEY"].blank?
      skip "Skipping AI test due to missing DEEPSEEK_API_KEY environment variable or CI environment"
    end
  end

  test "Translate to English with default system prompt" do
    text = "你好，世界。"
    result = Ai::Completion.new(text: text).perform
    assert_equal "Hello, world.", result.content
    assert_respond_to result, :tokens
    assert_respond_to result, :model_id
    assert_respond_to result, :duration_ms
  end

  test "Translate to Japanese" do
    text = "你好，世界。"
    prompt = <<~PROMPT.freeze
      Translate to Japanese
    PROMPT
    result = Ai::Completion.new(text: text, prompt: prompt).perform
    assert_equal "こんにちは、世界。", result.content
  end

  test "Translate to Chinese" do
    text = "Hello, world."
    prompt = <<~PROMPT.freeze
      Translate to Chinese
    PROMPT
    result = Ai::Completion.new(text: text, prompt: prompt).perform
    assert_equal "你好，世界。", result.content
  end
end
