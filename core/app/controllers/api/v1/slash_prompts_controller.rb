class Api::V1::SlashPromptsController < Api::V1::BaseController
  before_action :set_slash_prompt, only: %i[ update destroy ]

  def index
    @slash_prompts = Current.account.slash_prompts.order(:created_at)
  end

  def create
    @slash_prompt = Current.account.slash_prompts.build(slash_prompt_params)

    if @slash_prompt.save
      render :show, status: :created
    else
      render json: { errors: @slash_prompt.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    if @slash_prompt.update(slash_prompt_params)
      render :show
    else
      render json: { errors: @slash_prompt.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    @slash_prompt.destroy
    head :no_content
  end

  private
    def set_slash_prompt
      @slash_prompt = Current.account.slash_prompts.find(params[:id])
    end

    def slash_prompt_params
      params.require(:slash_prompt).permit(:key, :value, aliases: [])
    end
end
