import requests

BASE_URL = "http://localhost:3000"
USERNAME = "john@doe.com"
PASSWORD = "johndoe123"
TIMEOUT = 30

def test_get_roles_list_with_valid_authorization():
    # Authenticate to get JWT token
    signin_url = f"{BASE_URL}/api/auth/signin"
    signin_payload = {"email": USERNAME, "password": PASSWORD}
    try:
        signin_resp = requests.post(signin_url, json=signin_payload, timeout=TIMEOUT)
        assert signin_resp.status_code == 200, f"Signin failed, expected 200 got {signin_resp.status_code}"
        token = signin_resp.json().get('token') or signin_resp.json().get('accessToken') or signin_resp.json().get('jwt')
        # Fallback: if no token found, fail
        assert token, "JWT token not found in signin response"

        headers = {"Authorization": f"Bearer {token}"}
        url = f"{BASE_URL}/api/roles"
        response = requests.get(url, headers=headers, timeout=TIMEOUT)

        # Assert HTTP status code 200 OK
        assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"

        # Assert response is JSON
        json_data = response.json()
        assert isinstance(json_data, list), f"Expected response to be a list, got {type(json_data)}"

        # Verify each role has at least an 'id' and 'name' fields
        for role in json_data:
            assert isinstance(role, dict), f"Each role should be a dict, got {type(role)}"
            assert "id" in role, "Role missing 'id' field"
            assert "name" in role, "Role missing 'name' field"

    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_get_roles_list_with_valid_authorization()