class CreatePrompts < ActiveRecord::Migration[8.2]
  def change
    create_table :prompts, id: :uuid do |t|
      t.uuid :account_id, null: false
      t.string :key, null: false
      t.text :value, null: false
      t.string :aliases, default: "[]"

      t.timestamps
    end

    add_index :prompts, :account_id
    add_index :prompts, [ :account_id, :key ], unique: true
  end
end
