class AddPromptKeyToCompletions < ActiveRecord::Migration[8.2]
  def change
    add_column :completions, :prompt_key, :string, null: false, default: "/default"
  end
end
