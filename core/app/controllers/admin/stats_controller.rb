class Admin::StatsController < AdminController
  def show
    @accounts_count = Account.count
    @identities_count = Identity.count
    @users_count = User.count
    @completions_count = Completion.count
    @slash_prompts_count = SlashPrompt.count
    @sessions_count = Session.count
    @active_sessions_count = Session.where("updated_at > ?", 24.hours.ago).count
    @completions_by_week = Completion.counts_by_week
  end
end
