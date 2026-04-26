class User < ApplicationRecord
  include Role

  belongs_to :account
  belongs_to :identity, optional: true

  validates :name, presence: true

  enum :role, { owner: "owner", admin: "admin", member: "member" }, default: "member"

  validates :role, presence: true
end
