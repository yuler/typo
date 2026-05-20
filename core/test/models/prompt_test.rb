require "test_helper"

class PromptTest < ActiveSupport::TestCase
  setup do
    @account = Account.create!(name: "Test Account")
  end

  test "should be valid with valid attributes" do
    prompt = Prompt.new(
      account: @account,
      key: "/test",
      value: "Test prompt value",
      aliases: ["/t", "/my_test"]
    )
    assert prompt.valid?
  end

  test "should normalize aliases array" do
    prompt = Prompt.new(
      account: @account,
      key: "/test",
      value: "Test",
      aliases: [" /t  ", "", nil, "/ok"]
    )
    assert prompt.valid?
    assert_equal ["/t", "/ok"], prompt.aliases
  end

  test "should be invalid without key or value" do
    prompt = Prompt.new(account: @account)
    assert_not prompt.valid?
    assert_includes prompt.errors[:key], "can't be blank"
    assert_includes prompt.errors[:value], "can't be blank"
  end

  test "should validate key pattern" do
    prompt1 = Prompt.new(account: @account, key: "test", value: "x")
    prompt2 = Prompt.new(account: @account, key: "/test-invalid", value: "x")
    prompt3 = Prompt.new(account: @account, key: "/test_ok", value: "x")

    assert_not prompt1.valid?
    assert_not prompt2.valid?
    assert prompt3.valid?
  end

  test "should validate unique key per account" do
    Prompt.create!(account: @account, key: "/test", value: "one")
    duplicate = Prompt.new(account: @account, key: "/test", value: "two")

    assert_not duplicate.valid?
    assert_includes duplicate.errors[:key], "already exists for this account"
  end

  test "should validate aliases pattern" do
    prompt1 = Prompt.new(account: @account, key: "/key", value: "x", aliases: ["t"])
    prompt2 = Prompt.new(account: @account, key: "/key", value: "x", aliases: ["/t-invalid"])
    prompt3 = Prompt.new(account: @account, key: "/key", value: "x", aliases: ["/t_ok"])

    assert_not prompt1.valid?
    assert_not prompt2.valid?
    assert prompt3.valid?
  end

  test "should create defaults for account" do
    Prompt.create_defaults_for!(@account)
    assert_equal 4, @account.prompts.count
    assert_includes @account.prompts.map(&:key), "/prompt"
    assert_includes @account.prompts.map(&:key), "/zh"
    assert_includes @account.prompts.map(&:key), "/jp"
    assert_includes @account.prompts.map(&:key), "/ph"
  end
end
