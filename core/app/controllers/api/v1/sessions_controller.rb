class Api::V1::SessionsController < Api::V1::BaseController
  include SessionIdentity

  skip_account_scope

  def show
    render_session_identity
  end

  def destroy
    Current.session&.destroy
    head :no_content
  end
end
