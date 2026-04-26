class Session < ApplicationRecord
  belongs_to :identity
  
  validates :token, presence: true, uniqueness: true
end
