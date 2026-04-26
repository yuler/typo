class CreateMultiTenancyTables < ActiveRecord::Migration[8.0]
  def change
    create_table :identities, id: :uuid do |t|
      t.string :email, null: false, index: { unique: true }
      t.boolean :staff, default: false, null: false
      t.timestamps
    end

    create_table :accounts, id: :uuid do |t|
      t.string :name, null: false
      t.string :slug, null: false, index: { unique: true }
      t.boolean :solo, default: true, null: false
      t.timestamps
    end

    create_table :users, id: :uuid do |t|
      t.references :account, null: false, foreign_key: true, type: :uuid
      t.references :identity, null: false, foreign_key: true, type: :uuid
      t.string :name, null: false
      t.string :role, null: false
      t.boolean :active, default: true, null: false
      t.timestamps
    end

    create_table :sessions, id: :uuid do |t|
      t.references :identity, null: false, foreign_key: true, type: :uuid
      t.string :token, null: false, index: { unique: true }
      t.string :ip_address
      t.string :user_agent
      t.datetime :last_active_at
      t.timestamps
    end

    create_table :magic_links, id: :uuid do |t|
      t.references :identity, null: false, foreign_key: true, type: :uuid
      t.string :code, null: false, index: { unique: true }
      t.datetime :expires_at, null: false
      t.datetime :used_at
      t.timestamps
    end
  end
end
