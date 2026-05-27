class Session < ApplicationRecord
  belongs_to :identity

  enum :kind, { web: "web", desktop: "desktop" }

  broadcasts_to ->(session) { [ session.identity, "sessions" ] }, inserts_by: :prepend, target: "sessions", partial: "my/sessions/session"

  def user_agent_summary
    return "Unknown Device" if user_agent.blank?

    os = case user_agent
    when /Macintosh|Mac OS X|macOS/i then "macOS"
    when /Windows/i then "Windows"
    when /Linux/i then "Linux"
    when /iPhone/i then "iPhone"
    when /iPad/i then "iPad"
    when /Android/i then "Android"
    end

    client = case user_agent
    when /Typo/i then "Typo Client"
    when /Edg/i then "Edge"
    when /Chrome/i then "Chrome"
    when /Firefox/i then "Firefox"
    when /Safari/i then "Safari"
    end

    hostname = user_agent[/Typo Desktop\/[^\s]+ \([^;)]+;\s*([^)]+)\)/, 1]&.strip

    parts = []
    if client && os
      parts << "#{client} on #{os}"
    elsif client || os
      parts << (client || os)
    end
    parts << "(#{hostname})" if hostname.present? && hostname != "Unknown"

    parts.presence&.join(" ") || user_agent.truncate(35)
  end

  def desktop_version
    return unless desktop? && user_agent.present?

    match = user_agent[%r{Typo Desktop/([^\s]+)}, 1]
    "v#{match}" if match.present?
  end
end
