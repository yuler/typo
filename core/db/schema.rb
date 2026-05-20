# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.2].define(version: 2026_05_20_120000) do
  create_table "accounts", id: :uuid, force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.boolean "personal", default: false, null: false
    t.string "slug", null: false
    t.datetime "updated_at", null: false
    t.index ["slug"], name: "index_accounts_on_slug", unique: true
  end

  create_table "completions", id: :uuid, force: :cascade do |t|
    t.uuid "account_id"
    t.datetime "created_at", null: false
    t.integer "duration_ms"
    t.text "input"
    t.string "model"
    t.text "output"
    t.text "prompt"
    t.string "status", default: "success", null: false
    t.json "tokens"
    t.datetime "updated_at", null: false
    t.uuid "user_id"
    t.index ["account_id"], name: "index_completions_on_account_id"
    t.index ["user_id"], name: "index_completions_on_user_id"
  end

  create_table "default_prompts", id: :uuid, force: :cascade do |t|
    t.uuid "account_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.text "value", null: false
    t.index ["account_id"], name: "index_default_prompts_on_account_id", unique: true
  end

  create_table "device_authorizations", id: :uuid, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "device_code", null: false
    t.datetime "expires_at", null: false
    t.uuid "identity_id"
    t.datetime "last_polled_at"
    t.string "status", default: "pending", null: false
    t.datetime "updated_at", null: false
    t.string "user_code", null: false
    t.index ["device_code"], name: "index_device_authorizations_on_device_code", unique: true
    t.index ["identity_id"], name: "index_device_authorizations_on_identity_id"
    t.index ["user_code"], name: "index_device_authorizations_on_user_code", unique: true
  end

  create_table "identities", id: :uuid, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "email", null: false
    t.boolean "staff", default: false, null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_identities_on_email", unique: true
  end

  create_table "magic_links", id: :uuid, force: :cascade do |t|
    t.string "code", null: false
    t.datetime "created_at", null: false
    t.datetime "expires_at", null: false
    t.uuid "identity_id"
    t.datetime "updated_at", null: false
    t.index ["code"], name: "index_magic_links_on_code", unique: true
    t.index ["identity_id"], name: "index_magic_links_on_identity_id"
  end

  create_table "sessions", id: :uuid, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.uuid "identity_id"
    t.string "ip_address"
    t.string "kind", default: "web", null: false
    t.datetime "last_active_at"
    t.datetime "updated_at", null: false
    t.string "user_agent"
    t.index ["identity_id"], name: "index_sessions_on_identity_id"
  end

  create_table "slash_prompts", id: :uuid, force: :cascade do |t|
    t.uuid "account_id", null: false
    t.text "aliases", default: "[]"
    t.datetime "created_at", null: false
    t.string "key", null: false
    t.datetime "updated_at", null: false
    t.text "value", null: false
    t.index ["account_id", "key"], name: "index_slash_prompts_on_account_id_and_key", unique: true
    t.index ["account_id"], name: "index_slash_prompts_on_account_id"
  end

  create_table "users", id: :uuid, force: :cascade do |t|
    t.uuid "account_id"
    t.boolean "active", default: true, null: false
    t.datetime "created_at", null: false
    t.uuid "identity_id"
    t.string "name", null: false
    t.string "role", null: false
    t.datetime "updated_at", null: false
    t.datetime "verified_at"
    t.index ["account_id"], name: "index_users_on_account_id"
    t.index ["identity_id"], name: "index_users_on_identity_id"
  end
end
