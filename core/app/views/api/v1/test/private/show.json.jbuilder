json.message "private success"

json.account do
  json.partial! "api/v1/accounts/account", account: Current.account
end

json.identity do
  json.partial! "api/v1/identities/identity", identity: Current.identity
end
