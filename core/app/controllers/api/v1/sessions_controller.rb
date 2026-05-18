class Api::V1::SessionsController < Api::V1::BaseController
  def destroy
    Current.session&.destroy
    head :no_content
  end
end
