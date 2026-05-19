class Signup
  include ActiveModel::Model
  include ActiveModel::Attributes
  include ActiveModel::Validations

  attr_accessor :username, :nickname, :email, :identity
  attr_reader :account, :user

  validates :email, format: { with: URI::MailTo::EMAIL_REGEXP }, on: :identity_creation
  validates :username, :nickname, :identity, presence: true, on: :completion

  def initialize(...)
    super

    @email = @identity.email if @identity
  end

  def create_identity
    @identity = Identity.find_or_create_by!(email: email)
    @identity.send_magic_link
  end

  def create_personal_account
    return false unless valid?(:completion)

    self.username = username.to_s.parameterize

    ActiveRecord::Base.transaction do
      create_account(personal: true)
      true
    end
  rescue ActiveRecord::RecordInvalid => error
    if error.record.is_a?(Account)
      error.record.errors.each do |error_obj|
        attribute = error_obj.attribute == :slug ? :username : error_obj.attribute
        errors.add(attribute, error_obj.message)
      end
    else
      errors.add(:base, error.message)
    end
    false
  rescue => error
    errors.add(:base, "We couldn't create your account. Please check the errors below.")
    Rails.error.report(error, severity: :error)
    false
  end

  private
    def create_account(personal: false)
      @account = Account.create_with_owner(
        account: {
          name: nickname,
          slug: username,
          personal: personal
        },
        owner: {
          name: nickname,
          identity: identity
        }
      )
      @user = @account.users.find_by!(role: :owner)
    end
end
