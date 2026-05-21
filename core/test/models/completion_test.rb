require "test_helper"

class CompletionTest < ActiveSupport::TestCase
  test "should be valid with required attributes" do
    account = Account.create!(name: "Test Account")
    completion = Completion.new(
      account: account,
      input: "hello",
      output: "hi",
      prompt: "be helpful",
      prompt_key: "/default",
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
      prompt_key: "/default",
      status: "success"
    )
    assert_not completion.valid?
    assert_includes completion.errors[:input], "can't be blank"
  end

  test "counts_by_week returns completion counts per week" do
    account = Account.create!(name: "Test Account")
    this_week = Time.zone.today.noon
    last_week = 1.week.ago.noon

    Completion.create!(
      account: account,
      input: "this week",
      prompt_key: "/default",
      status: "success",
      created_at: this_week
    )
    Completion.create!(
      account: account,
      input: "last week",
      prompt_key: "/default",
      status: "success",
      created_at: last_week
    )

    counts = Completion.counts_by_week(weeks: 2)

    assert_equal 2, counts.size
    assert_equal 1, counts.first[:count]
    assert_equal 1, counts.second[:count]
  end
end
