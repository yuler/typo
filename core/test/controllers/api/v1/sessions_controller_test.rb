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
end
