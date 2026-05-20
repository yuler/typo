class RenamePromptsToSlashPromptsAndCreateDefaultPrompts < ActiveRecord::Migration[8.2]
  def change
    rename_table :prompts, :slash_prompts

    create_table :default_prompts, id: :uuid do |t|
      t.uuid :account_id, null: false
      t.text :value, null: false

      t.timestamps
    end

    add_index :default_prompts, :account_id, unique: true
  end
end
