class Api::V1::StatsController < Api::V1::BaseController
  def show
    completions_count = Current.user.completions.count
    render json: {
      completions: completions_count,
      # TODO: Current is saved in the desktop client. Consider persisting it on the server.
      slash_commands: Current.account.slash_prompts.count
    }
  end
end
