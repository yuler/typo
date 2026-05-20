class Api::V1::PromptsController < Api::V1::BaseController
  before_action :set_prompt, only: %i[ update destroy ]

  # GET /api/v1/prompts
  def index
    @prompts = Current.account.prompts.order(:created_at)
  end

  # POST /api/v1/prompts
  def create
    @prompt = Current.account.prompts.build(prompt_params)

    if @prompt.save
      render :show, status: :created
    else
      render json: { errors: @prompt.errors.full_messages }, status: :unprocessable_entity
    end
  end

  # PATCH/PUT /api/v1/prompts/:id
  def update
    if @prompt.update(prompt_params)
      render :show
    else
      render json: { errors: @prompt.errors.full_messages }, status: :unprocessable_entity
    end
  end

  # DELETE /api/v1/prompts/:id
  def destroy
    @prompt.destroy
    head :no_content
  end

  private

  def set_prompt
    @prompt = Current.account.prompts.find(params[:id])
  end

  def prompt_params
    params.require(:prompt).permit(:key, :value, aliases: [])
  end
end
