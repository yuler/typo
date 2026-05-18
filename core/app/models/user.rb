class User < ApplicationRecord
  include Role

  belongs_to :account
  belongs_to :identity, optional: true

  has_many :completions

  validates :name, presence: true
  validates :role, presence: true

  delegate :email, to: :identity, allow_nil: true

  def avatar_url(size: 80)
    hash = identity&.email.present? ? Digest::MD5.hexdigest(identity.email.downcase.strip) : Digest::MD5.hexdigest(name.downcase.strip)
    "https://secure.gravatar.com/avatar/#{hash}?s=#{size}&d=mp"
  end
end
