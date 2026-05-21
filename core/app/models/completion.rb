class Completion < ApplicationRecord
  belongs_to :account, optional: true
  belongs_to :user, optional: true

  validates :input, presence: true
  validates :status, presence: true

  scope :ordered, -> { order(created_at: :desc) }

  WEEK_GROUP_SQL = Arel.sql("date(created_at, 'weekday 1', '-7 days')")

  def self.counts_by_week(weeks: 12)
    grouped = group(WEEK_GROUP_SQL).count

    weeks.times.map do |i|
      week_start = i.weeks.ago.to_date.beginning_of_week(:monday)
      { week_start: week_start, count: grouped[week_start.to_s] || 0 }
    end
  end
end
