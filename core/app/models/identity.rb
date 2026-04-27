class Identity < ApplicationRecord
  has_many :users
  has_many :accounts, through: :users
  has_many :sessions
  has_many :magic_links

  validates :email, presence: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  normalizes :email, with: ->(value) { value.strip.downcase.presence }

  def send_magic_link
    magic_links.create!.tap do |magic_link|
      MagicLinkMailer.sign_in_instructions(magic_link).deliver_later
    end
  end
end
