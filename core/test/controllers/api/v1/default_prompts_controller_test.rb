require "test_helper"

class Api::V1::DefaultPromptsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @identity = Identity.create!(email: "test@#{SecureRandom.hex}.com")
    @account = Account.create!(name: "Test Account", personal: true)
    @user = User.create!(identity: @identity, account: @account, name: "Test User", role: "owner")
    @session = @identity.sessions.create!(user_agent: "TestAgent", ip_address: "127.0.0.1")
    @token_header = { "Authorization" => "Bearer #{@session.signed_id}" }
  end

  test "should return not found when default prompt missing" do
    get api_v1_default_prompt_url, headers: @token_header, as: :json
    assert_response :not_found
  end

  test "should get default prompt when present" do
    DefaultPrompt.create_default_for!(@account)

    get api_v1_default_prompt_url, headers: @token_header, as: :json
    assert_response :success

    json = JSON.parse(response.body)
    assert_equal DefaultPrompt::DEFAULT_VALUE, json["value"]
  end

  test "should create default prompt on update when missing" do
    assert_difference -> { DefaultPrompt.count }, 1 do
      patch api_v1_default_prompt_url,
        params: { default_prompt: { value: "Custom system prompt" } },
        headers: @token_header,
        as: :json
    end
    assert_response :success

    json = JSON.parse(response.body)
    assert_equal "Custom system prompt", json["value"]
  end

  test "should update existing default prompt" do
    DefaultPrompt.create_default_for!(@account)

    patch api_v1_default_prompt_url,
      params: { default_prompt: { value: "Updated system prompt" } },
      headers: @token_header,
      as: :json
    assert_response :success

    assert_equal "Updated system prompt", @account.default_prompt.reload.value
  end

  test "should return unauthorized if not authenticated" do
    get api_v1_default_prompt_url, as: :json
    assert_response :unauthorized
  end
end
