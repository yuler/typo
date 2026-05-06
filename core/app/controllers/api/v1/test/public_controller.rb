class Api::V1::Test::PublicController < Api::V1::BaseController
  disallow_account_scope
  allow_unauthenticated_access

  def show
    render json: { message: "Public test success" }
  end
end
