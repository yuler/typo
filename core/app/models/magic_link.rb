class MagicLink < ApplicationRecord
  belongs_to :identity
  
  before_validation(on: :create) do
    self.code ||= SecureRandom.alphanumeric(6).upcase
    self.expires_at ||= 15.minutes.from_now
  end

  def expired?
    expires_at < Time.current
  end

  def used?
    used_at.present?
  end
end
