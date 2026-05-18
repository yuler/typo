require "test_helper"

class ActiveSessionsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @identity = Identity.create!(email: "test@#{SecureRandom.hex}.com")
    @account = Account.create!(name: "Test Account", personal: true)
    @user = User.create!(identity: @identity, account: @account, name: "Test User", role: "owner")
    @session = @identity.sessions.create!(user_agent: "TestAgent", ip_address: "127.0.0.1")
  end

  test "should get index when signed in" do
    # 1. Start login flow
    post session_url, params: { email: @identity.email }
    assert_response :redirect
    
    # 2. Complete login flow
    magic_link = @identity.magic_links.last
    post session_magic_link_url, params: { code: magic_link.code }
    assert_response :redirect
    
    # 3. Access active sessions with account slug
    get active_sessions_url(script_name: "/#{@account.slug}")
    assert_response :success
    assert_select "h1", "Active Sessions"
  end

  test "should redirect to login when not signed in" do
    get active_sessions_url(script_name: "/#{@account.slug}")
    # redirect_to_login_url uses script_name: nil
    assert_redirected_to new_session_path(script_name: nil)
  end

  test "should revoke another session" do
    other_session = @identity.sessions.create!(user_agent: "OtherAgent", ip_address: "1.1.1.1")
    
    # Sign in
    post session_url, params: { email: @identity.email }
    magic_link = @identity.magic_links.last
    post session_magic_link_url, params: { code: magic_link.code }
    
    assert_difference "Session.count", -1 do
      delete active_session_url(other_session, script_name: "/#{@account.slug}")
    end
    assert_redirected_to active_sessions_path(script_name: "/#{@account.slug}")
    assert_equal "Session revoked.", flash[:notice]
  end
end
