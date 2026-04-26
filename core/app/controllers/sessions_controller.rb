class SessionsController < ApplicationController
  skip_before_action :authenticate_identity, only: [:create]
  skip_before_action :resolve_account, only: [:create]

  def create
    magic_link = MagicLink.find_by(code: params[:code])

    if magic_link.nil? || magic_link.expired? || magic_link.used?
      return redirect_to new_magic_link_path, alert: "Invalid or expired code."
    end

    identity = magic_link.identity
    magic_link.update!(used_at: Time.current)

    # Solo Account Creation Logic
    account = identity.accounts.find_by(personal: true)
    unless account
      # Deriving slug from email prefix + random suffix
      email_prefix = identity.email.split("@").first.parameterize
      slug = "#{email_prefix}-#{SecureRandom.hex(2)}"
      account = Account.create!(name: email_prefix.titleize, slug: slug, personal: true)
      identity.users.create!(account: account, role: :owner)
    end

    session_record = identity.sessions.create!(
      token: SecureRandom.hex(32),
      ip_address: request.remote_ip,
      user_agent: request.user_agent,
      last_active_at: Time.current
    )
    
    cookies.signed[:session_token] = { value: session_record.token, httponly: true, secure: Rails.env.production? }
    
    redirect_to "/#{account.slug}/"
  end

  def destroy
    Current.session&.destroy
    cookies.delete(:session_token)
    redirect_to root_path, notice: "Logged out."
  end
end
