class Account < ApplicationRecord
  has_many :users
  has_many :identities, through: :users
  
  validates :name, presence: true
  validates :slug, presence: true, uniqueness: true, format: { with: /\A[a-z0-9-]+\z/ }
end
