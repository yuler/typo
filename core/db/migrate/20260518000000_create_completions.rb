class CreateCompletions < ActiveRecord::Migration[8.2]
  def change
    create_table :completions, id: :uuid do |t|
      t.references :account, type: :uuid, null: true, index: true
      t.references :user, type: :uuid, null: true, index: true
      t.text :prompt
      t.text :input
      t.text :output
      t.string :model
      t.json :tokens
      t.integer :duration_ms
      t.string :status, default: "success", null: false

      t.timestamps
    end
  end
end
