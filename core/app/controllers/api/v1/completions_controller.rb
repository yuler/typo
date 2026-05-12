class Api::V1::CompletionsController < Api::V1::BaseController
  allow_unauthenticated_access
  disallow_account_scope

  before_action :validate_params!
  before_action :check_rate_limit

  def create
    result = Ai::Completion.perform(text: params[:text], prompt: params[:prompt])
    render json: { result: result }, status: :ok
  end

  private
    def validate_params!
      if params[:text].blank?
        render json: { error: "Text parameter is required" }, status: :unprocessable_entity
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
