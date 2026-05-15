require "test_helper"

class Api::V1::Devices::AuthorizationsControllerTest < ActionDispatch::IntegrationTest
  test "should create device authorization" do
    assert_difference("Device::Authorization.count") do
      post api_v1_device_authorization_url
    end

    assert_response :success
    json = JSON.parse(response.body)
    assert_includes json.keys, "device_code"
    assert_includes json.keys, "user_code"
    assert_includes json.keys, "verification_uri"
    assert_includes json.keys, "expires_in"
    assert_includes json.keys, "interval"
  end
end
