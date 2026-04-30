class MagicLinkMailer < ApplicationMailer
  def sign_in_instructions(magic_link)
    @magic_link = magic_link
    @identity = @magic_link.identity

    mail to: @identity.email, subject: "Your sign in code is: #{ @magic_link.code }"
  end
end
