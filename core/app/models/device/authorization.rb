class Device::Authorization < ApplicationRecord
  POLLING_INTERVAL = 5

  belongs_to :identity, optional: true

  validates :device_code, :user_code, :expires_at, presence: true
  validates :status, inclusion: { in: %w[pending approved denied expired consumed] }
  validates :identity, presence: true, if: -> { status == "approved" }

  before_validation :set_defaults, on: :create

  scope :pending, -> { where(status: "pending") }
  scope :active, -> { where("expires_at > ?", Time.current) }

  def expired?
    expires_at < Time.current || status == "expired"
  end

  def polling_too_fast?
    last_polled_at.present? && last_polled_at > POLLING_INTERVAL.seconds.ago
  end

  private
    def set_defaults
      self.device_code ||= SecureRandom.hex(32)
      self.user_code ||= SecureRandom.alphanumeric(8).upcase.insert(4, "-")
      self.expires_at ||= 15.minutes.from_now
    end
end
