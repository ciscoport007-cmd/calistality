import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

admin_username = "john@doe.com"
admin_password = "johndoe123"

def test_post_api_users_create_user():
    signin_url = f"{BASE_URL}/api/auth/signin"
    users_url = f"{BASE_URL}/api/users"

    # Step 1: Authenticate admin to get JWT token
    signin_payload = {
        "email": admin_username.strip(),
        "password": admin_password
    }
    signin_response = requests.post(signin_url, json=signin_payload, timeout=TIMEOUT)
    assert signin_response.status_code == 200, f"Signin failed with status {signin_response.status_code}"
    try:
        signin_json = signin_response.json()
    except Exception:
        assert False, "Signin response is not valid JSON"

    token = None
    if "token" in signin_json and isinstance(signin_json["token"], str):
        token = signin_json["token"]
    elif "accessToken" in signin_json and isinstance(signin_json["accessToken"], str):
        token = signin_json["accessToken"]
    elif "jwt" in signin_json and isinstance(signin_json["jwt"], str):
        token = signin_json["jwt"]
    elif "session" in signin_json:
        session_obj = signin_json["session"]
        if isinstance(session_obj, dict):
            if "accessToken" in session_obj and isinstance(session_obj["accessToken"], str):
                token = session_obj["accessToken"]
            elif "jwt" in session_obj and isinstance(session_obj["jwt"], str):
                token = session_obj["jwt"]
    assert token, "JWT token not found in signin response"

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Step 2: List roles to pick a valid role (if any)
    roles_resp = requests.get(f"{BASE_URL}/api/roles", headers=headers, timeout=TIMEOUT)
    assert roles_resp.status_code == 200, f"Failed to fetch roles, status {roles_resp.status_code}"
    try:
        roles = roles_resp.json()
    except Exception:
        assert False, "Roles response is not valid JSON"

    assert isinstance(roles, list) and len(roles) > 0, "No roles found for user creation"
    role_name = roles[0].get("name") or roles[0].get("role") or None
    assert role_name, "Role name missing in roles response"

    # Step 3: List departments to pick a valid departmentId (if any)
    departments_resp = requests.get(f"{BASE_URL}/api/departments", headers=headers, timeout=TIMEOUT)
    assert departments_resp.status_code == 200, f"Failed to fetch departments, status {departments_resp.status_code}"
    try:
        departments = departments_resp.json()
    except Exception:
        departments = []

    department_id = None
    if isinstance(departments, list) and len(departments) > 0:
        department_id = departments[0].get("id") or departments[0].get("_id") or departments[0].get("departmentId") or None

    # Step 4: Create a new user using POST /api/users with valid data
    new_user_payload = {
        "name": "Test User TC008",
        "email": "testuser_tc008@example.com",
        "role": role_name
    }
    if department_id:
        new_user_payload["departmentId"] = department_id

    created_user_id = None
    try:
        create_resp = requests.post(users_url, json=new_user_payload, headers=headers, timeout=TIMEOUT)
        assert create_resp.status_code == 200, f"User creation failed with status {create_resp.status_code}"
        try:
            create_json = create_resp.json()
        except Exception:
            assert False, "Create user response is not valid JSON"

        assert create_json.get("name") == new_user_payload["name"], "Created user name mismatch"
        assert create_json.get("email") == new_user_payload["email"], "Created user email mismatch"
        assert create_json.get("role") == role_name, "Created user role mismatch"
        if department_id:
            dept_resp_id = create_json.get("departmentId") or create_json.get("department") or None
            assert dept_resp_id == department_id, "Created user departmentId mismatch"
        created_user_id = create_json.get("id") or create_json.get("_id") or None
        assert created_user_id, "Created user ID not found in response"
    finally:
        # Cleanup: Delete the created user if possible
        if created_user_id:
            delete_url = f"{users_url}/{created_user_id}"
            try:
                del_resp = requests.delete(delete_url, headers=headers, timeout=TIMEOUT)
                assert del_resp.status_code in (200, 204), f"Failed to delete user, status {del_resp.status_code}"
            except Exception:
                pass

    # Step 5: Attempt unauthorized creation without token or with invalid token
    unauthorized_resp = requests.post(users_url, json=new_user_payload, timeout=TIMEOUT)
    assert unauthorized_resp.status_code in (401, 403), f"Unauthorized request succeeded unexpectedly with status {unauthorized_resp.status_code}"

    headers_invalid = {
        "Authorization": "Bearer invalidtoken123",
        "Content-Type": "application/json"
    }
    invalid_token_resp = requests.post(users_url, json=new_user_payload, headers=headers_invalid, timeout=TIMEOUT)
    assert invalid_token_resp.status_code in (401, 403), f"Invalid token request succeeded unexpectedly with status {invalid_token_resp.status_code}"


test_post_api_users_create_user()
