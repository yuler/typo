class Admin::StatsController < AdminController
  def show
    @accounts_count = Account.count
    @active_users_count = User.active.count
    @completions_count = Completion.count
    @slash_prompts_count = SlashPrompt.count

    @completions_by_week = Completion.counts_by_week
  end
end
