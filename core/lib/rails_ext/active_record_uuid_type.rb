# core/lib/rails_ext/active_record_uuid_type.rb
module ActiveRecord
  module Type
    class Uuid < Binary
      BASE36_LENGTH = 25 # 36^25 > 2^128

      class << self
        def generate
          require "securerandom" unless defined?(SecureRandom)
          uuid = SecureRandom.respond_to?(:uuid_v7) ? SecureRandom.uuid_v7 : SecureRandom.uuid
          hex = uuid.delete("-")
          hex_to_base36(hex)
        end

        def hex_to_base36(hex)
          hex.to_i(16).to_s(36).rjust(BASE36_LENGTH, "0")
        end

        def base36_to_hex(base36)
          base36.to_s.to_i(36).to_s(16).rjust(32, "0")
        end
      end

      def serialize(value)
        return super if value.is_a?(ActiveModel::Type::Binary::Data)
        return unless value

        hex = Uuid.base36_to_hex(value)
        super([hex].pack("H*"))
      end

      def deserialize(value)
        return unless value

        hex = value.to_s.unpack1("H*")
        Uuid.hex_to_base36(hex)
      end

      def cast(value)
        if value.is_a?(String) && value.match?(/\A[0-9a-f]{8}-?([0-9a-f]{4}-?){3}[0-9a-f]{12}\z/i)
          Uuid.hex_to_base36(value.delete("-"))
        else
          super
        end
      end
    end
  end
end

ActiveRecord::Type.register(:uuid, ActiveRecord::Type::Uuid, adapter: :sqlite3)
