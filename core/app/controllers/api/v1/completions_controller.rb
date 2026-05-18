class Api::V1::CompletionsController < Api::V1::BaseController
  allow_unauthenticated_access
  skip_account_scope

  before_action :validate_params!
  before_action :check_rate_limit

  def create
    result = @completion.perform

    if authenticated?
      account = Current.account || Current.identity.personal_account
      if account
        Completion.create!(
          account: account,
          user: Current.user || Current.identity.users.find_by(account: account),
          prompt: @completion.prompt,
          input: params[:text],
          output: result.content,
          model: result.model_id,
          tokens: result.tokens,
          duration_ms: result.duration_ms,
          status: result.status
        )
      end
    end

    render json: { result: result.content }, status: :ok
  end

  private
    def validate_params!
      @completion = Ai::Completion.new(text: params[:text], prompt: params[:prompt])
      if @completion.invalid?
        render json: { error: @completion.errors.full_messages.to_sentence }, status: :unprocessable_entity
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
