class Identity < ApplicationRecord
  has_many :users
  has_many :accounts, through: :users
  has_many :sessions
  has_many :magic_links

  validates :email, presence: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  normalizes :email, with: ->(value) { value.strip.downcase.presence }

  def self.find_by_permissable_access_token(token, method:)
    Identity.first

    # TODO: Implement this with access token
    # if (access_token = AccessToken.find_by(token: token)) && access_token.allows?(method)
    #   access_token.identity
    # end
  end

  def send_magic_link
    magic_links.create!.tap do |magic_link|
      MagicLinkMailer.sign_in_instructions(magic_link).deliver_later
    end
  end

  def personal_account
    accounts.find_by(personal: true)
  end
end
