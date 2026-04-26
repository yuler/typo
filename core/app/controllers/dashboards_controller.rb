class DashboardsController < ApplicationController
  def show
    # if Current.account.nil?
    #   # If no account context, we might be at the true root "/"
    #   # Redirect to personal account if logged in, or login page
    #   if Current.identity
    #     personal_account = Current.identity.accounts.find_by(personal: true)
    #     redirect_to "/#{personal_account.slug}/"
    #   else
    #     redirect_to new_magic_link_path
    #   end
    # else
    #   # We are within an account context
    #   @account = Current.account
    #   @user = Current.user
    # end
  end
end
