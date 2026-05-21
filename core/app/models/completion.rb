class Completion < ApplicationRecord
  belongs_to :account, optional: true
  belongs_to :user, optional: true

  validates :input, presence: true
  validates :status, presence: true

  scope :ordered, -> { order(created_at: :desc) }
end
