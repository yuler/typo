require "test_helper"

class DefaultPromptTest < ActiveSupport::TestCase
  setup do
    @account = Account.create!(name: "Test Account")
  end

  test "should be valid with value" do
    default_prompt = DefaultPrompt.new(account: @account, value: "You are a helpful assistant.")
    assert default_prompt.valid?
  end

  test "should be invalid without value" do
    default_prompt = DefaultPrompt.new(account: @account)
    assert_not default_prompt.valid?
    assert_includes default_prompt.errors[:value], "can't be blank"
  end

  test "should create default for account" do
    DefaultPrompt.create_default_for!(@account)
    assert_equal DefaultPrompt::DEFAULT_VALUE, @account.default_prompt.value
  end
end
