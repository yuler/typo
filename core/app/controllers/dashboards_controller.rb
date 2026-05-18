class DashboardsController < ApplicationController
  def show
    @sessions = Current.identity.sessions.order(created_at: :desc)
  end
end
