class SessionsController < ApplicationController
  disallow_account_scope
  require_unauthenticated_access except: :destroy

  rate_limit to: 10, within: 3.minutes, only: :create, with: :rate_limit_exceeded

  layout "public"

  def new
  end

  def create

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
end
