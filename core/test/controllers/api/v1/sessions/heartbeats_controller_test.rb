require "test_helper"

class Api::V1::Sessions::HeartbeatsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @identity = Identity.find_or_create_by!(email: "heartbeat@example.com")
    @session = @identity.sessions.create!(kind: "desktop", user_agent: "Typo Desktop/0.1.0 (macOS)", ip_address: "127.0.0.1")
    @token = @session.signed_id
  end

  test "should get heartbeat and update last_active_at" do
    assert_changes -> { @session.reload.last_active_at } do
      get api_v1_session_heartbeat_url, headers: { Authorization: "Bearer #{@token}" }
    end
    assert_response :success
    json = JSON.parse(response.body)
    assert_equal @identity.email, json["email"]
    assert_equal @identity.display_name, json["name"]
  end

  test "should return unauthorized without token" do
    get api_v1_session_heartbeat_url
    assert_response :unauthorized
  end

  test "should return unauthorized with invalid token" do
    get api_v1_session_heartbeat_url, headers: { Authorization: "Bearer invalid_token" }
    assert_response :unauthorized
  end
end
