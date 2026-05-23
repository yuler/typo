class Admin::StatsController < AdminController
  def show
    @accounts_count = Account.count
    @completions_count = Completion.count

    @personal_accounts = Account.where(personal: true).map do |account|
      {
        name: account.name,
        total_completions: account.completions.count,
        today_completions: account.completions.where("created_at >= ?", Time.current.beginning_of_day).count
      }
    end.sort_by { |a| -a[:total_completions] }
  end
end
