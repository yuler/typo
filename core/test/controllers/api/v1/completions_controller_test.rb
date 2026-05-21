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

    completion = Completion.last
    assert_equal account, completion.account
    assert_equal "persist me", completion.input
    assert_equal "pending", completion.status

    perform_enqueued_jobs

    completion.reload
    assert_equal "__success__", completion.output
    assert_equal "success", completion.status
  end

  test "creates a Completion record for anonymous users" do
    assert_enqueued_with(job: CompletionPersistenceJob) do
      post api_v1_completions_url,
           params: { text: "anonymous text" },
           as: :json
    end
    assert_response :success

    completion = Completion.last
    assert_nil completion.account
    assert_nil completion.user
    assert_equal "/default", completion.prompt_key
    assert_equal "anonymous text", completion.input
    assert_equal "pending", completion.status

    perform_enqueued_jobs

    completion.reload
    assert_equal "__success__", completion.output
    assert_equal "success", completion.status
  end

  test "index unauthenticated should return unauthorized" do
    get api_v1_completions_url, as: :json
    assert_response :unauthorized
  end

  test "index authenticated returns paginated completions for current account" do
    account = Account.create!(name: "Personal", personal: true)
    identity = Identity.create!(email: "test@example.com")
    identity.users.create!(account: account, role: :owner, name: "Test User")
    token = identity.signed_id(purpose: :api_token)

    # Create completions belonging to this account
    Completion.create!(account: account, input: "text 1", output: "out 1", prompt_key: "/default", status: "success")
    Completion.create!(account: account, input: "text 2", output: "out 2", prompt_key: "/default", status: "success")

    # Create completion belonging to another account
    other_account = Account.create!(name: "Other", personal: true)
    other_identity = Identity.create!(email: "other@example.com")
    other_identity.users.create!(account: other_account, role: :owner, name: "Other User")
    Completion.create!(account: other_account, input: "other text", output: "other out", prompt_key: "/default", status: "success")

    get api_v1_completions_url, headers: { "Authorization" => "Bearer #{token}" }, as: :json
    assert_response :success

    body = JSON.parse(response.body)
    assert_equal 2, body["completions"].size
    assert_equal "text 2", body["completions"][0]["input"] # descending order
    assert_equal "text 1", body["completions"][1]["input"]
    assert_nil body["meta"]["next_page"]
    assert_equal false, body["meta"]["has_more"]
  end

  test "destroy unauthenticated should return unauthorized" do
    account = Account.create!(name: "Personal", personal: true)
    completion = Completion.create!(account: account, input: "text 1", output: "out 1", prompt_key: "/default", status: "success")

    delete api_v1_completion_url(completion), as: :json
    assert_response :unauthorized
  end

  test "destroy authenticated destroys completion belonging to account" do
    account = Account.create!(name: "Personal", personal: true)
    identity = Identity.create!(email: "test@example.com")
    identity.users.create!(account: account, role: :owner, name: "Test User")
    token = identity.signed_id(purpose: :api_token)

    completion = Completion.create!(account: account, input: "text 1", output: "out 1", prompt_key: "/default", status: "success")

    assert_difference -> { Completion.count }, -1 do
      delete api_v1_completion_url(completion), headers: { "Authorization" => "Bearer #{token}" }, as: :json
    end
    assert_response :no_content
  end

  test "destroy authenticated returns 404 for completion belonging to another account" do
    account = Account.create!(name: "Personal", personal: true)
    identity = Identity.create!(email: "test@example.com")
    identity.users.create!(account: account, role: :owner, name: "Test User")
    token = identity.signed_id(purpose: :api_token)

    other_account = Account.create!(name: "Other", personal: true)
    completion = Completion.create!(account: other_account, input: "text 1", output: "out 1", prompt_key: "/default", status: "success")

    assert_no_difference -> { Completion.count } do
      delete api_v1_completion_url(completion), headers: { "Authorization" => "Bearer #{token}" }, as: :json
    end
    assert_response :not_found
  end
end
