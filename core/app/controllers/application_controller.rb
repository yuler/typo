class ApplicationController < ActionController::Base
  before_action :authenticate_identity
  before_action :resolve_account

  private

  def authenticate_identity
    token = cookies.signed[:session_token]
    if token && (session_record = Session.find_by(token: token))
      Current.session = session_record
      Current.identity = session_record.identity
      session_record.touch(:last_active_at)
    end
  end

  def resolve_account
    if (slug = request.env["typo.account_slug"])
      Current.account = Account.find_by(slug: slug)
      
      if Current.account.nil?
        render plain: "Account Not Found", status: :not_found
        return
      end

      if Current.identity.nil?
        redirect_to new_magic_link_path(return_to: request.original_url), alert: "Please login first."
        return
      end

      Current.user = Current.identity.users.find_by(account: Current.account)

      if Current.user.nil?
        render plain: "Access Denied", status: :forbidden
        return
      end
    end
  end
end
