class Completion < ApplicationRecord
  belongs_to :account
  belongs_to :user, optional: true

  validates :input, presence: true
  validates :status, presence: true
end
