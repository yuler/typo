class Sessions::MenusController < ApplicationController
  disallow_account_scope

  layout "public"

  def show
    @accounts = Current.identity.accounts

    if @accounts.one?
      redirect_to root_url(script_name: "/#{@accounts.first.slug}")
    elsif @accounts.empty?
      signup = Signup.new({
        username: Current.identity.email.split("@").first,
        identity: Current.identity
      })

      if signup.create_personal_account
        redirect_to root_url(script_name: "/#{signup.account.slug}")
      else
        raise "Failed to create personal account: #{signup.errors.full_messages.join(", ")}"
      end
    end
  end
end
