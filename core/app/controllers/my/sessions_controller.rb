class My::SessionsController < ApplicationController
  def index
    @sessions = Current.identity.sessions.order(created_at: :desc)
  end

  def destroy
    session = Current.identity.sessions.find(params[:id])

    if session == Current.session
      terminate_session
      redirect_to login_url, notice: t(".revoked"), allow_other_host: true
    else
      session.destroy
      redirect_to my_sessions_path, notice: t(".revoked")
    end
  end

  private
    def require_account
      # Global sessions management does not require an account scope
    end
end
