class CreateDeviceAuthorizations < ActiveRecord::Migration[8.0]
  def change
    create_table :device_authorizations, id: :uuid do |t|
      t.string :device_code, null: false, index: { unique: true }
      t.string :user_code, null: false, index: { unique: true }
      t.references :identity, type: :uuid
      t.string :status, default: "pending", null: false
      t.datetime :expires_at, null: false

      t.timestamps
    end
  end
end
