class User < ApplicationRecord
  belongs_to :identity
  belongs_to :account
  
  enum :role, { owner: "owner", admin: "admin", member: "member" }, default: "member"
  
  validates :role, presence: true
end
