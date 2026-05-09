require "test_helper"

class Api::V1::CorrectionsControllerTest < ActionDispatch::IntegrationTest
  test "should get success on create" do
    post api_v1_corrections_url, params: { text: "hello", system_prompt: "correct this" }, as: :json
    assert_response :success
  end

  test "should rate limit after 5 requests" do
    # Clear cache to ensure clean state
    Rails.cache.clear

    5.times do
      post api_v1_corrections_url, params: { text: "test" }, as: :json
      assert_response :success
    end

    post api_v1_corrections_url, params: { text: "test" }, as: :json
    assert_response :too_many_requests
    assert_equal "Rate limit exceeded. Please try again in 15 minutes.", JSON.parse(response.body)["error"]
  end

  test "authenticated users should bypass rate limit" do
    Rails.cache.clear
    identity = Identity.create!(email: "test@example.com")
    token = identity.signed_id(purpose: :api_token)

    6.times do
      post api_v1_corrections_url, 
           params: { text: "test" }, 
           headers: { "Authorization" => "Bearer #{token}" }, 
           as: :json
      assert_response :success
    end
  end
end
