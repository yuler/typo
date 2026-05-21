class AddPromptKeyToCompletions < ActiveRecord::Migration[8.2]
  def change
    add_column :completions, :prompt_key, :string
  end
end
