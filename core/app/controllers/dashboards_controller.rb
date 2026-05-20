class DashboardsController < ApplicationController
  def show
    @sessions = Current.identity.sessions.order(created_at: :desc)
    @total_completions = Current.account.completions.count
    @total_slash_prompts = Current.account.slash_prompts.count
  end
end
