import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_post_api_auth_signin_user_login():
    signin_url = f"{BASE_URL}/api/auth/signin"
    valid_credentials = {
        "email": "john@doe.com",
        "password": "johndoe123"
    }
    invalid_credentials = {
        "email": "john@doe.com",
        "password": "wrongpassword"
    }

    headers = {
        "Content-Type": "application/json"
    }

    # Test valid credentials (expect 200 and session or token)
    try:
        response = requests.post(signin_url, json=valid_credentials, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request failed for valid credentials: {e}"
    assert response.status_code == 200, f"Expected 200 for valid credentials but got {response.status_code}"

    # Try to parse JSON, but handle empty or invalid
    try:
        resp_json = response.json()
    except Exception:
        resp_json = None

    assert resp_json is not None and isinstance(resp_json, dict) and len(resp_json) > 0, \
        "Response JSON is missing or empty for valid credentials"

    # Test invalid credentials (expect 401 Unauthorized)
    try:
        response_invalid = requests.post(signin_url, json=invalid_credentials, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request failed for invalid credentials: {e}"
    assert response_invalid.status_code == 401, f"Expected 401 for invalid credentials but got {response_invalid.status_code}"
    
    try:
        resp_invalid_json = response_invalid.json()
    except Exception:
        resp_invalid_json = None
    if resp_invalid_json:
        # Check for error field or message optional
        assert ('error' in resp_invalid_json) or ('message' in resp_invalid_json) or (len(resp_invalid_json) == 0), \
            "Unexpected response body for 401 Unauthorized"


test_post_api_auth_signin_user_login()
