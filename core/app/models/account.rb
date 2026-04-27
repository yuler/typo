class Account < ApplicationRecord
  has_many :users
  has_many :identities, through: :users

  validates :name, presence: true
  validates :slug, presence: true, uniqueness: true, format: { with: /\A[a-z0-9-_]+\z/ }

  before_validation :set_slug_from_name, on: :create
  # before_create :only_single_personal_account_allowed

  class << self
    def create_with_owner(account:, owner:)
      create!(**account).tap do |account|
        account.users.create!(role: :system, name: "System")
        account.users.create!(**owner.with_defaults(role: :owner, verified_at: Time.current))
      end
    end
  end

  private
    # TODO: implement this.
    # def only_single_personal_account_allowed
    #   if personal? && self.class.where(identity_id: Current.identity.id).exists?
    #     errors.add(:base, "Only one personal account is allowed.")
    #   end
    # end

    def set_slug_from_name
      self.slug = "#{name.first(4)}-#{rand(1000..9999)}" if slug.blank?
    end
end
