class Api::V1::CompletionsController < Api::V1::BaseController
  allow_unauthenticated_access
  disallow_account_scope

  before_action :check_rate_limit
  before_action :set_params

  def create
    result = Ai::Completion.perform(text: params[:text], prompt: params[:prompt])
    render json: { result: result }, status: :ok
  end

  private
    def set_params
      if params[:text].blank?
        render json: { error: "Text parameter is required" }, status: :unprocessable_entity
      end
    end

    def check_rate_limit
      authenticate_by_bearer_token || authenticate_by_query_token
      return if authenticated?

      ip = request.remote_ip
      key = "rate_limit:v1_completions:#{ip}"

      # Rails.cache.increment is atomic.
      # We use a 15-minute window. If the key doesn't exist, increment returns nil or 1 depending on backend.
      # To ensure atomicity and expiration, we can use a combination or check for nil.
      count = Rails.cache.increment(key, 1)

      if count.nil? || count == 1
        # Key didn't exist or was just created, set expiration
        Rails.cache.write(key, 1, expires_in: 15.minutes)
        count = 1
      end

      if count > 5
        render json: { error: "Rate limit exceeded. Please try again in 15 minutes." }, status: :too_many_requests
      end
    end
end
