require "test_helper"

class SignupTest < ActiveSupport::TestCase
  setup do
    @identity = Identity.create!(email: "jane@example.com")
    @signup_params = { username: "My New Account", nickname: "Jane Doe", identity: @identity }
  end

  test "slugifies username before creating account" do
    signup = Signup.new(@signup_params)
    assert signup.create_personal_account
    assert_equal "my-new-account", signup.account.slug
  end

  test "promotes validation errors from account to signup" do
    # Create an account with the slug first to trigger uniqueness error
    Account.create_with_owner(
      account: { name: "Existing", slug: "existing-slug", personal: false },
      owner: { name: "Owner", identity: Identity.create!(email: "owner@example.com") }
    )

    signup = Signup.new(@signup_params.merge(username: "Existing Slug"))
    assert_not signup.create_personal_account
    assert signup.errors[:username].include?("has already been taken")
  end

  test "promotes validation errors from user to signup" do
    signup = Signup.new(@signup_params)
    mock_user = User.new
    mock_user.errors.add(:name, "is invalid")

    mock_user.define_singleton_method(:save!) do |*args|
      raise ActiveRecord::RecordInvalid.new(mock_user)
    end

    stub_user_new(mock_user) do
      assert_not signup.create_personal_account
      assert signup.errors[:nickname].include?("is invalid")
    end
  end

  private
    def stub_user_new(mock_user)
      class << User
        alias_method :original_new, :new
        def new(*args, &block)
          if @mock_user
            block&.call(@mock_user)
            @mock_user
          else
            original_new(*args, &block)
          end
        end
      end

      User.instance_variable_set(:@mock_user, mock_user)
      yield
    ensure
      User.instance_variable_set(:@mock_user, nil)
      class << User
        alias_method :new, :original_new
        remove_method :original_new
      end
    end
end
