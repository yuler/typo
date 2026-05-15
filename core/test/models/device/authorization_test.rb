require "test_helper"

class Device::AuthorizationTest < ActiveSupport::TestCase
  test "sets defaults on creation" do
    auth = Device::Authorization.create!
    assert auth.device_code.present?
    assert auth.user_code.present?
    assert auth.expires_at > Time.current
    assert_equal "pending", auth.status
  end

  test "expired? returns true if expired_at is in the past" do
    auth = Device::Authorization.new(expires_at: 1.minute.ago)
    assert auth.expired?
  end

  test "expired? returns true if status is expired" do
    auth = Device::Authorization.new(status: "expired", expires_at: 1.minute.from_now)
    assert auth.expired?
  end
end
