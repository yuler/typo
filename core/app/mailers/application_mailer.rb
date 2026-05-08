class ApplicationMailer < ActionMailer::Base
  default from: ENV.fetch("MAILER_FROM", "Typo <support@example.com>")

  layout "mailer"
end
