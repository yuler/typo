require "test_helper"

class CompletionPersistenceJobTest < ActiveJob::TestCase
  test "creates a completion record" do
    account = Account.create!(name: "Test Account")
    attributes = {
      account_id: account.id,
      input: "hello",
      output: "hi",
      status: "success"
    }

    assert_difference "Completion.count", 1 do
      CompletionPersistenceJob.perform_now(attributes)
    end

    completion = Completion.last
    assert_equal "hello", completion.input
    assert_equal "hi", completion.output
  end

  test "logs error on invalid attributes" do
    attributes = { input: nil }

    assert_no_difference "Completion.count" do
      # Should not raise error but log it
      CompletionPersistenceJob.perform_now(attributes)
    end
  end
end
