import requests
from requests.auth import HTTPBasicAuth

BASE_URL = "http://localhost:3000"
USERNAME = "john@doe.com"
PASSWORD = "johndoe123"
TIMEOUT = 30

def test_get_api_users_list_all_users():
    try:
        signin_url = f"{BASE_URL}/api/auth/signin"
        signin_payload = {
            "email": USERNAME.strip(),
            "password": PASSWORD
        }
        signin_response = requests.post(signin_url, json=signin_payload, timeout=TIMEOUT)
        assert signin_response.status_code == 200, f"Signin failed with status {signin_response.status_code}"
        json_resp = signin_response.json()

        # Token extraction: try common keys or nested keys
        token = json_resp.get("token") or json_resp.get("accessToken") or json_resp.get("jwt")
        if not token and "session" in json_resp:
            token = json_resp.get("session")
            # If session is dict with accessToken
            if isinstance(token, dict):
                token = token.get("accessToken") or token.get("token")
        if not token and "user" in json_resp:
            user_obj = json_resp.get("user")
            if isinstance(user_obj, dict):
                token = user_obj.get("token")

        assert token is not None, "JWT token not found in signin response"

        headers = {
            "Authorization": f"Bearer {token}"
        }
        users_url = f"{BASE_URL}/api/users"
        users_response = requests.get(users_url, headers=headers, timeout=TIMEOUT)
        assert users_response.status_code == 200, f"Failed to get users list: HTTP {users_response.status_code}"
        users_data = users_response.json()
        assert isinstance(users_data, list), "Users response is not a list"
        for user in users_data:
            assert isinstance(user, dict), "User item is not a dict"
            assert "id" in user, "User item missing 'id'"
            assert "email" in user, "User item missing 'email'"
            assert "name" in user, "User item missing 'name'"

    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_get_api_users_list_all_users()
