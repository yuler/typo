require "test_helper"

class Api::V1::Devices::TokensControllerTest < ActionDispatch::IntegrationTest
  setup do
    @device_auth = Device::Authorization.create!
    @identity = Identity.find_or_create_by!(email: "token-test@example.com")
  end

  test "should get authorization pending when not approved" do
    get api_v1_device_token_url, params: { device_code: @device_auth.device_code }
    assert_response :precondition_required
    assert_equal "authorization_pending", JSON.parse(response.body)["error"]
  end

  test "should get token when approved" do
    @device_auth.update!(status: "approved", identity: @identity)

    get api_v1_device_token_url, params: { device_code: @device_auth.device_code }
    assert_response :success
    json = JSON.parse(response.body)
    assert_includes json.keys, "access_token"
    assert_includes json.keys, "identity"
    assert_equal "consumed", @device_auth.reload.status
  end

  test "should get expired_token when expired" do
    @device_auth.update!(expires_at: 1.minute.ago)

    get api_v1_device_token_url, params: { device_code: @device_auth.device_code }
    assert_response :gone
    assert_equal "expired_token", JSON.parse(response.body)["error"]
  end
end
