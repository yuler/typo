class MagicLink < ApplicationRecord
  belongs_to :identity
  
  validates :code, presence: true, uniqueness: true
  validates :expires_at, presence: true
end
