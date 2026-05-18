require "test_helper"

class CompletionPersistenceJobTest < ActiveJob::TestCase
  test "updates a completion record" do
    account = Account.create!(name: "Test Account")
    completion = Completion.create!(account: account, input: "hello", status: "pending")
    attributes = {
      output: "hi",
      status: "success"
    }

    assert_no_difference "Completion.count" do
      CompletionPersistenceJob.perform_now(completion, attributes)
    end

    assert_equal "hi", completion.reload.output
    assert_equal "success", completion.status
  end

  test "logs error on invalid attributes" do
    completion = Completion.create!(input: "hello", status: "pending")
    attributes = { status: nil }

    assert_no_difference "Completion.count" do
      # Should not raise error but log it
      CompletionPersistenceJob.perform_now(completion, attributes)
    end
  end
end
