class Admin::StatsController < AdminController
  def show
    @accounts_count = Account.count
    @completions_count = Completion.count

    beginning_of_day = Time.current.beginning_of_day
    accounts = Account.where(personal: true)

    total_counts = Completion.where(account_id: accounts.ids).group(:account_id).count
    today_counts = Completion.where(account_id: accounts.ids).where("created_at >= ?", beginning_of_day).group(:account_id).count

    @personal_accounts = accounts.map do |account|
      {
        name: account.name,
        total_completions: total_counts[account.id] || 0,
        today_completions: today_counts[account.id] || 0
      }
    end.sort_by { |a| -a[:total_completions] }
  end
end
