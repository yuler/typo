class User < ApplicationRecord
  include Role

  belongs_to :account
  belongs_to :identity, optional: true

  validates :name, presence: true
  validates :role, presence: true
end
