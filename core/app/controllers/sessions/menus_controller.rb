class Sessions::MenusController < ApplicationController
  disallow_account_scope

  layout "public"

  def show
    @accounts = Current.identity.accounts

    if @accounts.one?
      redirect_to root_url(script_name: "/#{@accounts.first.slug}")
    elsif @accounts.empty?
      redirect_to new_onboarding_path(script_name: nil)
    end
  end
end
