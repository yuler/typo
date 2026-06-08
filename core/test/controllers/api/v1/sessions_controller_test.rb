require "test_helper"

class Api::V1::SessionsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @identity = Identity.create!(email: "test@#{SecureRandom.hex}.com")
    @account = Account.create!(name: "Test Account", personal: true)
    @user = User.create!(identity: @identity, account: @account, name: "Test User", role: "owner")
    @session = @identity.sessions.create!(user_agent: "TestAgent", ip_address: "127.0.0.1")
  end

  test "should destroy session" do
    assert_difference "Session.count", -1 do
      delete api_v1_session_url, headers: { "Authorization" => "Bearer #{@session.signed_id}" }, as: :json
    end
    assert_response :no_content
  end

  test "should return unauthorized if no session" do
    delete api_v1_session_url, as: :json
    assert_response :unauthorized
  end

  test "should show session and update last_active_at" do
    assert_changes -> { @session.reload.last_active_at } do
      get api_v1_session_url, headers: { "Authorization" => "Bearer #{@session.signed_id}" }
    end
    assert_response :success
    json = JSON.parse(response.body)
    assert_equal @identity.email, json["email"]
    assert_equal @identity.display_name, json["name"]
    assert_nil json["avatar_url"]
  end

  test "should return unauthorized for show without token" do
    get api_v1_session_url
    assert_response :unauthorized
  end

  test "should return unauthorized for show with invalid token" do
    get api_v1_session_url, headers: { "Authorization" => "Bearer invalid_token" }
    assert_response :unauthorized
  end
end
