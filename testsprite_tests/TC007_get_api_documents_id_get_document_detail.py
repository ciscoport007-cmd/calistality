import requests

BASE_URL = "http://localhost:3000"
AUTH_USERNAME = "john@doe.com "
AUTH_PASSWORD = "johndoe123"
TIMEOUT = 30

def test_get_document_detail():
    session = requests.Session()
    try:
        # Sign in to get JWT token
        signin_resp = session.post(
            f"{BASE_URL}/api/auth/signin",
            json={"email": AUTH_USERNAME.strip(), "password": AUTH_PASSWORD},
            timeout=TIMEOUT,
        )
        assert signin_resp.status_code == 200, f"Signin failed: {signin_resp.text}"
        token = signin_resp.json().get("token")
        assert token, "Token not found in signin response"

        headers = {
            "Authorization": f"Bearer {token}"
        }

        # Create a new document to test GET /api/documents/{id} with valid ID
        create_data = {
            "title": "Test Document for Detail",
            "content": "Content for detail test",
            "folderId": "folder123"
        }
        create_resp = session.post(
            f"{BASE_URL}/api/documents",
            json=create_data,
            headers=headers,
            timeout=TIMEOUT,
        )
        assert create_resp.status_code == 200, f"Document creation failed: {create_resp.text}"
        created_doc = create_resp.json()
        doc_id = created_doc.get("id")
        assert doc_id, "Created document ID not found"

        # Test GET /api/documents/{id} for existing document
        get_resp = session.get(
            f"{BASE_URL}/api/documents/{doc_id}",
            headers=headers,
            timeout=TIMEOUT,
        )
        assert get_resp.status_code == 200, f"Failed to get existing document: {get_resp.text}"
        doc_detail = get_resp.json()
        assert doc_detail.get("id") == doc_id, "Returned document ID does not match requested ID"
        assert doc_detail.get("title") == create_data["title"], "Document title mismatch"
        assert doc_detail.get("content") == create_data["content"], "Document content mismatch"

        # Test GET /api/documents/{id} for non-existing document ID
        non_exist_id = "nonexistent-id-1234567890"
        get_nonexist_resp = session.get(
            f"{BASE_URL}/api/documents/{non_exist_id}",
            headers=headers,
            timeout=TIMEOUT,
        )
        assert get_nonexist_resp.status_code == 404, f"Expected 404 for non-existing document but got {get_nonexist_resp.status_code}"

    finally:
        # Clean up: delete created document if exists
        try:
            if 'doc_id' in locals():
                del_resp = session.delete(
                    f"{BASE_URL}/api/documents/{doc_id}",
                    headers=headers,
                    timeout=TIMEOUT,
                )
                # Allow 200 or 204 as success for delete
                assert del_resp.status_code in (200, 204), f"Failed to delete test document: {del_resp.text}"
        except Exception:
            pass

test_get_document_detail()