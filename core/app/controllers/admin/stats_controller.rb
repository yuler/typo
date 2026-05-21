class Admin::StatsController < AdminController
  def show
    @accounts_count = Account.count
    @completions_count = Completion.count
  end
end
