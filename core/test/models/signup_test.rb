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

    User.define_singleton_method(:new) do |*args, &block|
      block&.call(mock_user)
      mock_user
    end

    begin
      assert_not signup.create_personal_account
      assert signup.errors[:nickname].include?("is invalid")
    ensure
      User.singleton_class.remove_method(:new)
    end
  end


end
