require "test_helper"

class AdminControllerTest < ActionDispatch::IntegrationTest
  setup do
    @identity = Identity.create!(email: "admin-test@#{SecureRandom.hex}.com", staff: true)
    @session = @identity.sessions.create!(user_agent: "TestAgent", ip_address: "127.0.0.1")
    post session_url, params: { email: @identity.email }
    magic_link = @identity.magic_links.last
    post session_magic_link_url, params: { code: magic_link.code }
  end

  test "staff can access admin home and stats" do
    get admin_url
    assert_response :success
    assert_select "a[href=?]", admin_stats_path

    get admin_stats_url
    assert_response :success
    assert_select "div", text: "Accounts"
    assert_select "div", text: "Active Users"
    assert_select "div", text: "Completions"
    assert_select "div", text: "Slash Prompts"
  end

  test "non-staff is forbidden" do
    @identity.update!(staff: false)

    get admin_url
    assert_response :forbidden
  end
end
