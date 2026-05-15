class AddLastPolledAtToDeviceAuthorizations < ActiveRecord::Migration[8.0]
  def change
    add_column :device_authorizations, :last_polled_at, :datetime
  end
end
