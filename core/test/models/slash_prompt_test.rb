require "test_helper"

class SlashPromptTest < ActiveSupport::TestCase
  setup do
    @account = Account.create!(name: "Test Account")
  end

  test "should be valid with valid attributes" do
    slash_prompt = SlashPrompt.new(
      account: @account,
      key: "/test",
      value: "Test prompt value",
      aliases: [ "/t", "/my_test" ]
    )
    assert slash_prompt.valid?
  end

  test "should normalize aliases array" do
    slash_prompt = SlashPrompt.new(
      account: @account,
      key: "/test",
      value: "Test",
      aliases: [ " /t  ", "", nil, "/ok" ]
    )
    assert slash_prompt.valid?
    assert_equal [ "/t", "/ok" ], slash_prompt.aliases
  end

  test "should be invalid without key or value" do
    slash_prompt = SlashPrompt.new(account: @account)
    assert_not slash_prompt.valid?
    assert_includes slash_prompt.errors[:key], "can't be blank"
    assert_includes slash_prompt.errors[:value], "can't be blank"
  end

  test "should validate key pattern" do
    slash_prompt1 = SlashPrompt.new(account: @account, key: "test", value: "x")
    slash_prompt2 = SlashPrompt.new(account: @account, key: "/test-invalid", value: "x")
    slash_prompt3 = SlashPrompt.new(account: @account, key: "/test_ok", value: "x")

    assert_not slash_prompt1.valid?
    assert_not slash_prompt2.valid?
    assert slash_prompt3.valid?
  end

  test "should validate unique key per account" do
    SlashPrompt.create!(account: @account, key: "/test", value: "one")
    duplicate = SlashPrompt.new(account: @account, key: "/test", value: "two")

    assert_not duplicate.valid?
    assert_includes duplicate.errors[:key], "already exists for this account"
  end

  test "should validate aliases pattern" do
    slash_prompt1 = SlashPrompt.new(account: @account, key: "/key", value: "x", aliases: [ "t" ])
    slash_prompt2 = SlashPrompt.new(account: @account, key: "/key", value: "x", aliases: [ "/t-invalid" ])
    slash_prompt3 = SlashPrompt.new(account: @account, key: "/key", value: "x", aliases: [ "/t_ok" ])

    assert_not slash_prompt1.valid?
    assert_not slash_prompt2.valid?
    assert slash_prompt3.valid?
  end

  test "should reject trigger that matches another prompts key or alias" do
    SlashPrompt.create!(account: @account, key: "/main", value: "v", aliases: [ "/shortcut" ])

    conflicts_with_alias = SlashPrompt.new(account: @account, key: "/shortcut", value: "other")
    assert_not conflicts_with_alias.valid?
    assert_includes conflicts_with_alias.errors[:base].join, "trigger '/shortcut'"

    conflicts_with_key = SlashPrompt.new(account: @account, key: "/other", value: "v", aliases: [ "/main" ])
    assert_not conflicts_with_key.valid?
    assert_includes conflicts_with_key.errors[:base].join, "trigger '/main'"
  end

  test "should create defaults for account" do
    SlashPrompt.create_defaults_for!(@account)
    assert_equal 4, @account.slash_prompts.count
    assert_includes @account.slash_prompts.map(&:key), "/prompt"
    assert_includes @account.slash_prompts.map(&:key), "/zh"
    assert_includes @account.slash_prompts.map(&:key), "/jp"
    assert_includes @account.slash_prompts.map(&:key), "/ph"
  end
end
