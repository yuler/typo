class Signup
  include ActiveModel::Model
  include ActiveModel::Attributes
  include ActiveModel::Validations

  attr_accessor :username, :email, :identity
  attr_reader :account, :user

  validates :email, format: { with: URI::MailTo::EMAIL_REGEXP }, on: :identity_creation
  validates :username, :identity, presence: true, on: :completion

  def initialize(...)
    super

    @email = @identity.email if @identity
  end

  def create_identity
    @identity = Identity.find_or_create_by!(email: email)
    @identity.send_magic_link
  end

  def create_personal_account
    if valid?(:completion)
      begin
        create_account(personal: true)
        true
      rescue => error
        destroy_account

        errors.add(:base, "Something went wrong, and we couldn't create your account. Please give it another try.")
        Rails.error.report(error, severity: :error)
        Rails.logger.error error
        Rails.logger.error error.backtrace.join("\n")

        false
      end
    else
      false
    end
  end

  private
    def create_account(personal: false)
      @account = Account.create_with_owner(
        account: {
          name: username,
          personal: personal
        },
        owner: {
          name: username,
          identity: identity
        }
      )
      @user = @account.users.find_by!(role: :owner)
    end

    def destroy_account
      @account&.destroy!

      @user = nil
      @account = nil
    end
end
