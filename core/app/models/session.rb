class Session < ApplicationRecord
  belongs_to :identity

  def user_agent_summary
    return "Unknown Device" if user_agent.blank?

    os = case user_agent
         when /Macintosh|Mac OS X/i then "macOS"
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

    if client && os
      "#{client} on #{os}"
    elsif client || os
      client || os
    else
      user_agent.truncate(35)
    end
  end
end
