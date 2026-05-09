class Api::V1::CorrectionsController < Api::V1::BaseController
  allow_unauthenticated_access
  disallow_account_scope

  before_action :check_rate_limit

  def create
    render json: { result: "corrected: #{params[:text]}" }, status: :ok
  end

  private

  def check_rate_limit
    return if authenticated?

    ip = request.remote_ip
    key = "rate_limit:v1_corrections:#{ip}"
    count = Rails.cache.read(key) || 0

    if count >= 5
      render json: { error: "Rate limit exceeded. Please try again in 15 minutes." }, status: :too_many_requests
    else
      Rails.cache.write(key, count + 1, expires_in: 15.minutes)
    end
  end
end
