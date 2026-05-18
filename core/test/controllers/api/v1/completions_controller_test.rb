require "test_helper"

class Api::V1::CompletionsControllerTest < ActionDispatch::IntegrationTest
  include ActiveJob::TestHelper

  setup do
    Rails.cache.clear
    @original_perform = Ai::Completion.instance_method(:perform)
    Ai::Completion.define_method(:perform) do
      Ai::Result.new("__success__", { "total" => 10 }, "test-model", 100, "success")
    end
  end

  teardown do
    Ai::Completion.define_method(:perform, @original_perform)
  end

  test "should get success on create" do
    post api_v1_completions_url, params: { text: "some text", prompt: "correct this" }, as: :json
    assert_response :success
    assert_equal "__success__", JSON.parse(response.body)["result"]
  end

  test "should return unprocessable_entity if text is missing" do
    post api_v1_completions_url, params: { prompt: "correct this" }, as: :json
    assert_response :unprocessable_entity
    assert_equal "Text can't be blank", JSON.parse(response.body)["error"]
  end

  test "should return unprocessable_entity if text is too long" do
    long_text = "a" * (Ai::Completion::MAX_TEXT_LENGTH + 1)
    post api_v1_completions_url, params: { text: long_text }, as: :json
    assert_response :unprocessable_entity
    assert_equal "Text is too long (maximum is #{Ai::Completion::MAX_TEXT_LENGTH} characters)", JSON.parse(response.body)["error"]
  end

  test "should rate limit after 5 requests" do
    5.times do
      post api_v1_completions_url, params: { text: "some text" }, as: :json
      assert_response :success
    end

    post api_v1_completions_url, params: { text: "some text" }, as: :json
    assert_response :too_many_requests
    assert_equal "Rate limit exceeded. Please try again in 15 minutes.", JSON.parse(response.body)["error"]
  end

  test "authenticated users should bypass rate limit" do
    identity = Identity.create!(email: "test@example.com")
    token = identity.signed_id(purpose: :api_token)

    6.times do
      post api_v1_completions_url, params: { text: "some text" }, headers: { "Authorization" => "Bearer #{token}" }, as: :json
      assert_response :success
    end
  end

  test "creates a Completion record for authenticated users" do
    account = Account.create!(name: "Personal", personal: true)
    identity = Identity.create!(email: "test@example.com")
    identity.users.create!(account: account, role: :owner, name: "Test User")
    token = identity.signed_id(purpose: :api_token)

    assert_enqueued_with(job: CompletionPersistenceJob) do
      post api_v1_completions_url,
           params: { text: "persist me" },
           headers: { "Authorization" => "Bearer #{token}" },
           as: :json
    end
    assert_response :success

    perform_enqueued_jobs

    completion = Completion.last
    assert_equal account, completion.account
    assert_equal "persist me", completion.input
    assert_equal "__success__", completion.output
  end
end
