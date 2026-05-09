require "test_helper"

module Ai
  class CompletionTest < ActiveSupport::TestCase
    test "perform returns AI result with text" do
      text = "Hello world"
      result = Ai::Completion.perform(text: text)
      p result
      assert_equal "Hello world", result
    end

    # test "perform with system prompt returns AI result with text" do
    #   text = "Hello world"
    #   system_prompt = "You are a helpful assistant"
    #   # result = Ai::Completion.perform(text: text, system_prompt: system_prompt)
    # end
  end
end
