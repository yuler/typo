require "test_helper"

class DeviceAuthorizationFlowTest < ActionDispatch::IntegrationTest
  setup do
    @identity = Identity.find_or_create_by!(email: "test@example.com")
    @account = @identity.personal_account || Account.create!(name: "Test Account", personal: true)
    @user = User.find_or_create_by!(identity: @identity, account: @account) do |u|
      u.name = "Test User"
      u.role = "admin"
    end
  end

  test "full device authorization flow" do
    # 1. Initiate authorization
    post api_v1_device_authorization_url
    assert_response :success
    json = JSON.parse(response.body)
    device_code = json["device_code"]
    user_code = json["user_code"]
    assert device_code.present?
    assert user_code.present?

    # 2. Poll token (pending)
    get api_v1_device_token_url, params: { device_code: device_code }
    assert_response :precondition_required
    assert_equal "authorization_pending", JSON.parse(response.body)["error"]

    # 3. User authorizes in browser
    # Simulate login if necessary. Here we assume Current.identity is set via some mechanism or we mock it.
    # In a real integration test, we might use a helper to sign in.
    sign_in_as(@identity)

    get device_url(user_code: user_code)
    assert_response :success

    patch device_url(user_code: user_code), params: { commit: "approve" }
    assert_redirected_to root_url

    # 4. Poll token (success)
    get api_v1_device_token_url, params: { device_code: device_code }
    assert_response :success
    json = JSON.parse(response.body)
    access_token = json["access_token"]
    assert access_token.present?
    assert_equal @identity.id, json["identity"]["id"]

    # 5. Use access token for authenticated request
    get api_v1_test_private_url, headers: { "Authorization" => "Bearer #{access_token}" }
    assert_response :success
  end

  private

  def sign_in_as(identity)
    # 1. Request magic link
    post session_url, params: { email: identity.email }
    assert_response :redirect

    # 2. Get code from DB
    magic_link = identity.magic_links.last
    code = magic_link.code

    # 3. Consume magic link
    # We need the email_pending_authentication in the session, which should be there from step 1
    post session_magic_link_url, params: { code: code }
    assert_response :redirect
    follow_redirect!
  end
end
