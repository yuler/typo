require "test_helper"

class Api::V1::CompletionsControllerTest < ActionDispatch::IntegrationTest
  setup do
    Rails.cache.clear
    @original_perform = Ai::Completion.method(:perform)
    Ai::Completion.define_singleton_method(:perform) { |**_| "__success__" }
  end

  teardown do
    Ai::Completion.define_singleton_method(:perform, @original_perform)
  end

  test "should get success on create" do
    post api_v1_completions_url, params: { text: "some text", prompt: "correct this" }, as: :json
    assert_response :success
    assert_equal "__success__", JSON.parse(response.body)["result"]
  end

  test "should return unprocessable_entity if text is missing" do
    post api_v1_completions_url, params: { prompt: "correct this" }, as: :json
    assert_response :unprocessable_entity
    assert_equal "Text parameter is required", JSON.parse(response.body)["error"]
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
end
