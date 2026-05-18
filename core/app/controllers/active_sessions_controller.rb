class ActiveSessionsController < ApplicationController
  def index
    @sessions = Current.identity.sessions.order(created_at: :desc)
  end

  def destroy
    session = Current.identity.sessions.find(params[:id])
    session.destroy
    redirect_to active_sessions_path, notice: "Session revoked."
  end
end
