class Api::V1::StatsController < Api::V1::BaseController
  def show
    completions_count = Current.user.completions.count
    render json: {
      completions: completions_count,
      slash_commands: 0
    }
  end
end
