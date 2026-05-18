class DashboardsController < ApplicationController
  def show
    @sessions = Current.identity.sessions.order(created_at: :desc)
    @total_completions = Current.user.completions.count
  end
end
