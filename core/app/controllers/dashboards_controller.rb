class DashboardsController < ApplicationController
  def show
    @sessions = Current.identity.sessions.order(created_at: :desc)
    @total_completions = Current.account.completions.count
    @total_prompts = Current.account.prompts.count
  end
end
