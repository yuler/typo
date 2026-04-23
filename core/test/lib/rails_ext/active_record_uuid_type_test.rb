# core/test/lib/rails_ext/active_record_uuid_type_test.rb
require "test_helper"

class ActiveRecordUuidTypeTest < ActiveSupport::TestCase
  test "uuid type is registered for sqlite3 adapter" do
    type = ActiveRecord::Type.lookup(:uuid, adapter: :sqlite3)

    assert_equal "ActiveRecord::Type::Uuid", type.class.name
  end

  test "generate returns 25-char base36 token" do
    value = ActiveRecord::Type::Uuid.generate

    assert_equal 25, value.length
    assert_match(/\A[0-9a-z]+\z/, value)
  end

  test "serialize and deserialize round trip" do
    type = ActiveRecord::Type::Uuid.new
    original = ActiveRecord::Type::Uuid.generate

    binary = type.serialize(original)
    round_trip = type.deserialize(binary)

    assert_equal original, round_trip
  end
end
