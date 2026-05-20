class ChangeSlashPromptsAliasesToText < ActiveRecord::Migration[8.2]
  def change
    change_column :slash_prompts, :aliases, :text
  end
end
