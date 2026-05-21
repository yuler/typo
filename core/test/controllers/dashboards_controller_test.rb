require "test_helper"

class DashboardsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @identity = Identity.create!(email: "dashboard-test@#{SecureRandom.hex}.com")
    @account = Account.create!(name: "Test Account", personal: true)
    @user = User.create!(identity: @identity, account: @account, name: "Test User", role: "owner")
    @session = @identity.sessions.create!(user_agent: "TestAgent", ip_address: "127.0.0.1")
  end

  test "should get dashboard show and contain the correct link to manage sessions" do
    # 1. Start login flow
    post session_url, params: { email: @identity.email }
    assert_response :redirect

    # 2. Complete login flow
    magic_link = @identity.magic_links.last
    post session_magic_link_url, params: { code: magic_link.code }
    assert_response :redirect

    # 3. Access dashboard with account slug
    get dashboard_url(script_name: "/#{@account.slug}")
    assert_response :success

    # Verify that the manage sessions link has the correct href (does not prepend the account slug)
    assert_select "a[href=?]", "/my/sessions", text: "Manage sessions"
  end
end
