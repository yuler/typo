class Api::V1::BaseController < ActionController::API
  include ApiAuthentication
  include Authorization
  include CurrentRequest
  include GearedPagination::Controller

  rescue_from ActiveRecord::RecordNotFound do |exception|
    render json: { error: exception.message }, status: :not_found
  end
end
