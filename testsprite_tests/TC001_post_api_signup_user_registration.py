import requests

BASE_URL = "http://localhost:3000"
SIGNUP_ENDPOINT = "/api/signup"

headers = {
    "Content-Type": "application/json"
}

timeout = 30

def test_post_api_signup_user_registration():
    # 1. Test successful user registration with valid data
    valid_user = {
        "email": "testuser@example.com",
        "password": "StrongPass123!"
    }
    try:
        response = requests.post(
            BASE_URL + SIGNUP_ENDPOINT,
            json=valid_user,
            headers=headers,
            timeout=timeout
        )
    except requests.RequestException as e:
        assert False, f"Request to signup endpoint failed: {e}"

    assert response.status_code == 200, f"Expected 200 OK, got {response.status_code}"
    try:
        json_data = response.json()
    except Exception as e:
        assert False, f"Response is not valid JSON: {e}"
    assert "email" in json_data and json_data["email"] == valid_user["email"]

    # 2. Test registration with invalid data (missing password)
    invalid_user_1 = {
        "email": "invaliduser@example.com"
    }
    try:
        response = requests.post(
            BASE_URL + SIGNUP_ENDPOINT,
            json=invalid_user_1,
            headers=headers,
            timeout=timeout
        )
    except requests.RequestException as e:
        assert False, f"Request to signup endpoint with missing password failed: {e}"

    assert response.status_code == 400, f"Expected 400 Bad Request for missing password, got {response.status_code}"

    # 3. Test registration with invalid data (invalid email format)
    invalid_user_2 = {
        "email": "invalid-email-format",
        "password": "SomePass123!"
    }
    try:
        response = requests.post(
            BASE_URL + SIGNUP_ENDPOINT,
            json=invalid_user_2,
            headers=headers,
            timeout=timeout
        )
    except requests.RequestException as e:
        assert False, f"Request to signup endpoint with invalid email failed: {e}"

    assert response.status_code == 400, f"Expected 400 Bad Request for invalid email, got {response.status_code}"

    # 4. Test registration with empty body
    try:
        response = requests.post(
            BASE_URL + SIGNUP_ENDPOINT,
            json={},
            headers=headers,
            timeout=timeout
        )
    except requests.RequestException as e:
        assert False, f"Request to signup endpoint with empty body failed: {e}"

    assert response.status_code == 400, f"Expected 400 Bad Request for empty body, got {response.status_code}"

test_post_api_signup_user_registration()
