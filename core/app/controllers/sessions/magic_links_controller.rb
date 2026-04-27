class Sessions::MagicLinksController < ApplicationController
  disallow_account_scope
  require_unauthenticated_access
  rate_limit to: 10, within: 15.minutes, only: :create, with: :rate_limit_exceeded
  before_action :ensure_that_email_pending_authentication_exists

  layout "public"

  def show
  end

  def create
    if magic_link = MagicLink.consume(code)
      authenticate magic_link
    else
      invalid_code
    end
  end

  private
    def ensure_that_email_pending_authentication_exists
      unless email_pending_authentication.present?
        alert_message = "Enter your email address to sign in."
        redirect_to new_session_path, alert: alert_message
      end
    end

    def code
      params.expect(:code)
    end

    def authenticate(magic_link)
      if ActiveSupport::SecurityUtils.secure_compare(email_pending_authentication || "", magic_link.identity.email)
        sign_in magic_link
      else
        email_mismatch
      end
    end

    def sign_in(magic_link)
      clear_pending_authentication_token
      start_new_session_for magic_link.identity

      redirect_to after_sign_in_url(magic_link)
    end

    def email_mismatch
      clear_pending_authentication_token

      alert_message = "Something went wrong. Please try again."
      redirect_to new_session_path, alert: alert_message
    end

    def invalid_code
      redirect_to session_magic_link_path, flash: { shake: true }
    end

    def after_sign_in_url(magic_link)
      if magic_link.identity.accounts.empty?
        signup = Signup.new({
          username: magic_link.identity.email.split("@").first,
          identity: magic_link.identity
        })

        signup.create_personal_account
        redirect_to root_url(script_name: signup.account.slug)
      else
        after_authentication_url
      end
    end

    def rate_limit_exceeded
      rate_limit_exceeded_message = "Try again in 15 minutes."
      redirect_to session_magic_link_path, alert: rate_limit_exceeded_message
    end

    def requires_signup_completion?(magic_link)
      magic_link.for_sign_up?
    end
end
