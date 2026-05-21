class Admin::StatsController < AdminController
  def show
    @accounts_count = Account.count
    @completions_count = Completion.count
    @completions_by_week = Completion.counts_by_week
  end
end
