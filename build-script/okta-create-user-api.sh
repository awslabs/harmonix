echo "OKTA_API_TOKEN: $OKTA_API_TOKEN"
echo "OKTA_AUDIENCE: $OKTA_AUDIENCE"
echo "OKTA_USER_EMAIL: $OKTA_USER_EMAIL"

curl -v -X POST \
-H "Accept: application/json" \
-H "Content-Type: application/json" \
-H "Authorization: SSWS $OKTA_API_TOKEN" \
-d '{
  "profile": {
    "firstName": "Workshop",
    "lastName": "Attendee",
    "email": "'"$OKTA_USER_EMAIL"'",
    "login": "'"$OKTA_USER_EMAIL"'"
  },
  "credentials": {
    "password" : { "value": "OpaWorkshop123!" }
  }
}' "${OKTA_AUDIENCE}/api/v1/users?activate=true"
