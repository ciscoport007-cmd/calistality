import requests

BASE_URL = "http://localhost:3000"
AUTH_USERNAME = "john@doe.com"
AUTH_PASSWORD = "johndoe123"
TIMEOUT = 30

def test_post_api_documents_create_new_document():
    signin_url = f"{BASE_URL}/api/auth/signin"
    signin_payload = {"email": AUTH_USERNAME.strip(), "password": AUTH_PASSWORD}
    signin_headers = {"Content-Type": "application/json"}
    signin_resp = requests.post(signin_url, json=signin_payload, headers=signin_headers, timeout=TIMEOUT)
    assert signin_resp.status_code == 200, f"Signin failed: {signin_resp.text}"
    try:
        signin_data = signin_resp.json()
    except Exception as e:
        assert False, f"Signin response is not JSON: {signin_resp.text}"

    # Token might be in 'token' or 'accessToken' or under 'session' key
    token = signin_data.get("token") or signin_data.get("accessToken")
    if not token and "session" in signin_data:
        token = signin_data["session"].get("accessToken") if isinstance(signin_data["session"], dict) else None
    assert token, f"No token returned from signin: {signin_data}"

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    created_document_id = None

    try:
        document_payload = {
            "title": "Test Document Title",
            "content": "This is the content of the test document.",
            "folderId": "test-folder-123"
        }
        create_url = f"{BASE_URL}/api/documents"
        create_resp = requests.post(create_url, json=document_payload, headers=headers, timeout=TIMEOUT)
        assert create_resp.status_code == 200, f"Document creation failed: {create_resp.text}"
        create_resp_json = create_resp.json()
        assert isinstance(create_resp_json, dict), "Create response is not a JSON object"
        assert "title" in create_resp_json and create_resp_json["title"] == document_payload["title"], "Title mismatch in create response"
        assert "content" in create_resp_json and create_resp_json["content"] == document_payload["content"], "Content mismatch in create response"
        assert "folderId" in create_resp_json and create_resp_json["folderId"] == document_payload["folderId"], "folderId mismatch in create response"
        created_document_id = create_resp_json.get("id")
        assert created_document_id is not None, "No document id returned"

        incomplete_payload = {
            "content": "Content without title",
            "folderId": "test-folder-123"
        }
        missing_field_resp = requests.post(create_url, json=incomplete_payload, headers=headers, timeout=TIMEOUT)
        assert missing_field_resp.status_code == 400, f"Expected 400 for missing fields but got {missing_field_resp.status_code}"
        try:
            missing_resp_json = missing_field_resp.json()
        except Exception:
            missing_resp_json = {}
        assert "error" in missing_resp_json or "message" in missing_resp_json, "No error message returned for missing fields"
    finally:
        if created_document_id:
            delete_url = f"{BASE_URL}/api/documents/{created_document_id}"
            del_resp = requests.delete(delete_url, headers=headers, timeout=TIMEOUT)
            assert del_resp.status_code == 200, f"Failed to delete document in cleanup: {del_resp.text}"

test_post_api_documents_create_new_document()
