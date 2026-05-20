class Api::V1::StatsController < Api::V1::BaseController
  def show
    render json: {
      completions: Current.account.completions.count,
      slash_commands: Current.account.slash_prompts.count
    }
  end
end
