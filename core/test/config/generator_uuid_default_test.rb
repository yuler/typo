# core/test/config/generator_uuid_default_test.rb
require "test_helper"

class GeneratorUuidDefaultTest < ActiveSupport::TestCase
  test "active record generators default primary key type to uuid" do
    options = Rails.application.config.generators.options
    active_record_options = options[:active_record] || options["active_record"] || {}
    primary_key_type = active_record_options[:primary_key_type] || active_record_options["primary_key_type"]

    assert_equal :uuid, primary_key_type
  end
end
