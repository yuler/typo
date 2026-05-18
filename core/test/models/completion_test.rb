require "test_helper"

class CompletionTest < ActiveSupport::TestCase
  test "should be valid with required attributes" do
    account = Account.create!(name: "Test Account")
    completion = Completion.new(
      account: account,
      input: "hello",
      output: "hi",
      prompt: "be helpful",
      model: "test-model",
      tokens: { total: 10 },
      duration_ms: 100,
      status: "success"
    )
    assert completion.valid?
  end

  test "should be invalid without input" do
    account = Account.create!(name: "Test Account")
    completion = Completion.new(
      account: account,
      status: "success"
    )
    assert_not completion.valid?
    assert_includes completion.errors[:input], "can't be blank"
  end
end
