class Api::V1::DefaultPromptsController < Api::V1::BaseController
  def show
    @default_prompt = Current.account.default_prompt
    return head :not_found unless @default_prompt

    render :show
  end

  def update
    @default_prompt = Current.account.default_prompt || Current.account.build_default_prompt

    if @default_prompt.update(default_prompt_params)
      render :show
    else
      render json: { errors: @default_prompt.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private
    def default_prompt_params
      params.require(:default_prompt).permit(:value)
    end
end
