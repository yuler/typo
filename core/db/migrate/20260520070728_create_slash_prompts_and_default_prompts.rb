class CreateSlashPromptsAndDefaultPrompts < ActiveRecord::Migration[8.2]
  def change
    create_table :slash_prompts, id: :uuid do |t|
      t.uuid :account_id, null: false
      t.string :key, null: false
      t.text :value, null: false
      t.string :aliases, default: "[]"

      t.timestamps
    end

    add_index :slash_prompts, :account_id
    add_index :slash_prompts, [ :account_id, :key ], unique: true

    create_table :default_prompts, id: :uuid do |t|
      t.uuid :account_id, null: false
      t.text :value, null: false

      t.timestamps
    end

    add_index :default_prompts, :account_id, unique: true
  end
end
