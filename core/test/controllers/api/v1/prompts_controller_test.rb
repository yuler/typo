require "test_helper"

class Api::V1::PromptsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @identity = Identity.create!(email: "test@#{SecureRandom.hex}.com")
    @account = Account.create!(name: "Test Account", personal: true)
    @user = User.create!(identity: @identity, account: @account, name: "Test User", role: "owner")
    @session = @identity.sessions.create!(user_agent: "TestAgent", ip_address: "127.0.0.1")
    @token_header = { "Authorization" => "Bearer #{@session.signed_id}" }

    # Create a prompt for testing
    @prompt = @account.prompts.create!(key: "/test", value: "Test Value", aliases: ["/t"])
  end

  test "should get all prompts when authenticated" do
    get api_v1_prompts_url, headers: @token_header, as: :json
    assert_response :success

    json = JSON.parse(response.body)
    assert_equal 1, json.length
    assert_equal @prompt.id, json[0]["id"]
    assert_equal "/test", json[0]["key"]
    assert_equal ["/t"], json[0]["aliases"]
  end

  test "should create new prompt" do
    assert_difference -> { @account.prompts.count }, 1 do
      post api_v1_prompts_url,
        params: { prompt: { key: "/new", value: "New instruction", aliases: ["/n"] } },
        headers: @token_header,
        as: :json
    end
    assert_response :created

    json = JSON.parse(response.body)
    assert_equal "/new", json["key"]
    assert_equal "New instruction", json["value"]
    assert_equal ["/n"], json["aliases"]
  end

  test "should return error if prompt key duplicate" do
    assert_no_difference -> { @account.prompts.count } do
      post api_v1_prompts_url,
        params: { prompt: { key: "/test", value: "Duplicate" } },
        headers: @token_header,
        as: :json
    end
    assert_response :unprocessable_entity
  end

  test "should update prompt" do
    patch api_v1_prompt_url(@prompt),
      params: { prompt: { key: "/test_updated", value: "Updated Value", aliases: ["/tu"] } },
      headers: @token_header,
      as: :json
    assert_response :success

    @prompt.reload
    assert_equal "/test_updated", @prompt.key
    assert_equal "Updated Value", @prompt.value
    assert_equal ["/tu"], @prompt.aliases
  end

  test "should delete prompt" do
    assert_difference -> { @account.prompts.count }, -1 do
      delete api_v1_prompt_url(@prompt), headers: @token_header, as: :json
    end
    assert_response :no_content
  end

  test "should return unauthorized if not authenticated" do
    get api_v1_prompts_url, as: :json
    assert_response :unauthorized
  end
end
