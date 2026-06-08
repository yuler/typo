require "test_helper"

class SessionTest < ActiveSupport::TestCase
  test "user_agent_summary correctly identifies macOS desktop app" do
    session = Session.new(user_agent: "Typo Desktop/0.1.0 (macOS)")
    assert_equal "Typo Client on macOS", session.user_agent_summary
  end

  test "user_agent_summary correctly identifies macOS desktop app with hostname" do
    session = Session.new(user_agent: "Typo Desktop/0.1.0 (macOS; MacBook-Pro)")
    assert_equal "Typo Client on macOS (MacBook-Pro)", session.user_agent_summary
  end

  test "desktop_version returns correct desktop version tag" do
    session = Session.new(kind: :desktop, user_agent: "Typo Desktop/0.1.0 (macOS)")
    assert_equal "v0.1.0", session.desktop_version
  end

  test "desktop_version returns nil for web sessions" do
    session = Session.new(kind: :web, user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)")
    assert_nil session.desktop_version
  end
end
