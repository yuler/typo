class OnboardingsController < ApplicationController
  disallow_account_scope

  before_action :redirect_if_onboarded

  layout "public"

  def new
    email = Current.identity.email
    nickname = email.split("@").first
    username = "#{nickname}-#{rand(1000..9999)}"
    @signup = Signup.new(username: username, nickname: nickname, identity: Current.identity)
  end

  def create
    @signup = Signup.new(signup_params.merge(identity: Current.identity))

    if @signup.create_personal_account
      redirect_to root_url(script_name: "/#{@signup.account.slug}")
    else
      render :new, status: :unprocessable_entity
    end
  end

  private
    def redirect_if_onboarded
      if personal_account = Current.identity.personal_account
        redirect_to root_url(script_name: "/#{personal_account.slug}")
      end
    end

    def signup_params
      params.expect(signup: [ :username, :nickname ])
    end
end
