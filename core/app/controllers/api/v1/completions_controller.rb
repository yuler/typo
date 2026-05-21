class Api::V1::CompletionsController < Api::V1::BaseController
  allow_unauthenticated_access only: :create
  skip_account_scope only: :create

  before_action :validate_params!, only: :create
  before_action :check_rate_limit, only: :create

  def index
    completions = Completion.where(account: Current.account).ordered
    records = set_page_and_extract_portion_from(completions)

    render json: {
      completions: records.as_json(only: [ :id, :input, :output, :prompt, :prompt_key, :status, :created_at ]),
      meta: {
        page: @page.number,
        next_page: @page.last? ? nil : @page.next_param,
        has_more: !@page.last?
      }
    }
  end

  def destroy
    completion = Completion.where(account: Current.account).find(params[:id])
    completion.destroy!
    head :no_content
  end

  def create
    if authenticated?
      account = Current.account || Current.identity.personal_account
      user = Current.user || Current.identity.users.find_by(account: account)
    end

    completion = Completion.create!(
      account: account,
      user: user,
      prompt: @ai_completion.prompt,
      prompt_key: params[:prompt_key].presence,
      input: @ai_completion.text,
      status: "pending"
    )

    result = @ai_completion.perform

    if result && result.status == "success"
      CompletionPersistenceJob.perform_later(
        completion,
        output: result.content,
        model: result.model_id,
        tokens: result.tokens&.to_h,
        duration_ms: result.duration_ms,
        status: result.status
      )
    end

    render json: { result: result.content }, status: :ok
  end

  private
    def validate_params!
      @ai_completion = Ai::Completion.new(text: params[:text], prompt: params[:prompt])
      if @ai_completion.invalid?
        render json: { error: @ai_completion.errors.full_messages.to_sentence }, status: :unprocessable_entity
      end
    end

    def check_rate_limit
      authenticate_by_bearer_token || authenticate_by_query_token
      return if authenticated?

      ip = request.remote_ip
      key = "rate_limit:v1_completions:#{ip}"

      Rails.cache.write(key, 0, expires_in: 15.minutes, unless_exist: true)
      count = Rails.cache.increment(key)

      Rails.logger.info({ tag: "Api::V1::CompletionsController", ip: ip, count: count, key: key }.to_json)

      if count > 5
        render json: { error: "Rate limit exceeded. Please try again in 15 minutes." }, status: :too_many_requests
      end
    end
end
