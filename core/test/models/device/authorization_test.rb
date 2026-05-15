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

  test "polling_too_fast? returns true when polled within interval" do
    auth = Device::Authorization.create!
    auth.update!(last_polled_at: Time.current)
    assert auth.polling_too_fast?
  end

  test "polling_too_fast? returns false when not yet polled" do
    auth = Device::Authorization.create!
    assert_not auth.polling_too_fast?
  end

  test "polling_too_fast? returns false when interval has passed" do
    auth = Device::Authorization.create!
    auth.update!(last_polled_at: 10.seconds.ago)
    assert_not auth.polling_too_fast?
  end
end
