class MagicLinksController < ApplicationController
  skip_before_action :authenticate_identity, only: [:new, :create]
  skip_before_action :resolve_account, only: [:new, :create]

  def new
  end

  def create
    identity = Identity.find_or_create_by!(email: params[:email])
    magic_link = identity.magic_links.create!
    # MagicLinkMailer.login(magic_link).deliver_later
    # For now, we'll just show the code in the "sent" view for development
    @code = magic_link.code
    render :sent
  end
end
