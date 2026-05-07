class ApplicationMailer < ActionMailer::Base
  default from: ENV.fetch("MAILER_FROM", "Typo <hi@yuler.cc>")

  layout "mailer"
end
