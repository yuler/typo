class AddKindToSessions < ActiveRecord::Migration[8.0]
  def change
    add_column :sessions, :kind, :string, default: "web", null: false
  end
end
