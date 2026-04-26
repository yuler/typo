class Identity < ApplicationRecord
  has_many :users
  has_many :accounts, through: :users
  has_many :sessions
  has_many :magic_links
  
  validates :email, presence: true, format: { with: URI::MailTo::EMAIL_REGEXP }
end
