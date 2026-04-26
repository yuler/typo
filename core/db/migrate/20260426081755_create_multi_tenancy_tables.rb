class CreateMultiTenancyTables < ActiveRecord::Migration[8.0]
  def change
    create_table :identities, id: :string, limit: 25 do |t|
      t.string :email, null: false, index: { unique: true }
      t.timestamps
    end

    create_table :accounts, id: :string, limit: 25 do |t|
      t.string :name, null: false
      t.string :slug, null: false, index: { unique: true }
      t.boolean :personal, default: true, null: false
      t.timestamps
    end

    create_table :users, id: :string, limit: 25 do |t|
      t.string :identity_id, null: false, index: true
      t.string :account_id, null: false, index: true
      t.string :role, null: false
      t.timestamps
    end

    create_table :sessions, id: :string, limit: 25 do |t|
      t.string :identity_id, null: false, index: true
      t.string :token, null: false, index: { unique: true }
      t.string :ip_address
      t.string :user_agent
      t.datetime :last_active_at
      t.timestamps
    end

    create_table :magic_links, id: :string, limit: 25 do |t|
      t.string :identity_id, null: false, index: true
      t.string :code, null: false, index: { unique: true }
      t.datetime :expires_at, null: false
      t.datetime :used_at
      t.timestamps
    end
  end
end
