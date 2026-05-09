class Api::V1::CorrectionsController < Api::V1::BaseController
  allow_unauthenticated_access
  disallow_account_scope

  def create
    render json: { result: "corrected: #{params[:text]}" }, status: :ok
  end
end
