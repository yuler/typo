require "test_helper"

class My::SessionsControllerTest < ActionDispatch::IntegrationTest
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

    # 3. Access sessions without account slug
    get my_sessions_url(script_name: nil)
    assert_response :success
    assert_select "h1", "My Sessions"
  end

  test "should redirect to login when not signed in" do
    get my_sessions_url(script_name: nil)
    assert_redirected_to new_session_path(script_name: nil)
  end

  test "should revoke another session" do
    other_session = @identity.sessions.create!(user_agent: "OtherAgent", ip_address: "1.1.1.1")

    # Sign in
    post session_url, params: { email: @identity.email }
    magic_link = @identity.magic_links.last
    post session_magic_link_url, params: { code: magic_link.code }

    assert_difference "Session.count", -1 do
      delete my_session_url(other_session, script_name: nil)
    end
    assert_redirected_to my_sessions_path(script_name: nil)
    assert_equal "Session revoked.", flash[:notice]
  end

  test "should revoke current session" do
    post session_url, params: { email: @identity.email }
    magic_link = @identity.magic_links.last
    post session_magic_link_url, params: { code: magic_link.code }

    current_session = @identity.sessions.order(:created_at).last

    assert_difference "Session.count", -1 do
      delete my_session_url(current_session, script_name: nil)
    end
    assert_redirected_to new_session_path(script_name: nil)
    assert_equal "Session revoked.", flash[:notice]
  end
end
