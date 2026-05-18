class My::SessionsController < ApplicationController
  def index
    @sessions = Current.identity.sessions.order(created_at: :desc)
  end

  def destroy
    session = Current.identity.sessions.find(params[:id])
    session.destroy
    redirect_to my_sessions_path, notice: "Session revoked."
  end

  private
    def require_account
      # Global sessions management does not require an account scope
    end
end
