class SessionsController < ApplicationController
  disallow_account_scope
  require_unauthenticated_access except: :destroy

  rate_limit to: 10, within: 3.minutes, only: :create, with: :rate_limit_exceeded

  layout "public"

  def new
  end

  def create
    if identity = Identity.find_by(email: email)
      sign_in identity
    else
      sign_up
    end
  end

  def destroy

  end

  private
    def rate_limit_exceeded
      rate_limit_exceeded_message = "Too many attempts. Try again later."

      respond_to do |format|
        format.html { redirect_to new_session_path, alert: rate_limit_exceeded_message }
        format.json { render json: { message: rate_limit_exceeded_message }, status: :too_many_requests }
      end
    end

    def email
      params.expect(:email)
    end

    def sign_in(identity)
      redirect_to_session_magic_link identity.send_magic_link
    end

    def sign_up
      signup = Signup.new(email: email)

      if signup.valid?(:identity_creation)
        magic_link = signup.create_identity
        redirect_to_session_magic_link magic_link
      else
        respond_to do |format|
          format.html { redirect_to new_session_path, alert: "Something went wrong" }
          format.json { render json: { message: "Something went wrong" }, status: :unprocessable_entity }
        end
      end
    end
end
