require "test_helper"

class Api::V1::Devices::TokensControllerTest < ActionDispatch::IntegrationTest
  setup do
    @device_authorization = Device::Authorization.create!
    @identity = Identity.find_or_create_by!(email: "token-test@example.com")
  end

  test "should get authorization pending when not approved" do
    post api_v1_device_token_url, params: { device_code: @device_authorization.device_code }
    assert_response :bad_request
    assert_equal "authorization_pending", JSON.parse(response.body)["error"]
  end

  test "should get token when approved" do
    @device_authorization.update!(status: "approved", identity: @identity)

    post api_v1_device_token_url, params: { device_code: @device_authorization.device_code }
    assert_response :success
    json = JSON.parse(response.body)
    assert_includes json.keys, "access_token"
    assert_includes json.keys, "identity"
    assert_equal "consumed", @device_authorization.reload.status
  end

  test "should get expired_token when expired" do
    @device_authorization.update!(expires_at: 1.minute.ago)

    post api_v1_device_token_url, params: { device_code: @device_authorization.device_code }
    assert_response :unauthorized
    assert_equal "expired_token", JSON.parse(response.body)["error"]
  end

  test "should get slow_down when polling too fast" do
    @device_authorization.update!(last_polled_at: Time.current)

    post api_v1_device_token_url, params: { device_code: @device_authorization.device_code }
    assert_response :bad_request
    assert_equal "slow_down", JSON.parse(response.body)["error"]
  end

  test "should get invalid_grant for invalid device_code" do
    post api_v1_device_token_url, params: { device_code: "invalid" }
    assert_response :bad_request
    assert_equal "invalid_grant", JSON.parse(response.body)["error"]
  end
end
