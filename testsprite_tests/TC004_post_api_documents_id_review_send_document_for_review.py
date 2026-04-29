import requests

BASE_URL = "http://localhost:3000"
USERNAME = "john@doe.com"
PASSWORD = "johndoe123"
TIMEOUT = 30


def test_post_api_documents_id_review_send_document_for_review():
    session = requests.Session()
    try:
        # Sign in to get JWT token
        signin_resp = session.post(
            f"{BASE_URL}/api/auth/signin",
            json={"email": USERNAME.strip(), "password": PASSWORD},
            headers={"Content-Type": "application/json"},
            timeout=TIMEOUT
        )
        assert signin_resp.status_code == 200, f"Signin failed: {signin_resp.text}"
        content_type = signin_resp.headers.get('Content-Type', '')
        assert 'application/json' in content_type, f"Signin response is not JSON: {signin_resp.text}"
        signin_data = signin_resp.json()
        # Try common token keys or nested structure
        token = None
        if isinstance(signin_data, dict):
            if 'accessToken' in signin_data:
                token = signin_data['accessToken']
            elif 'jwt' in signin_data:
                token = signin_data['jwt']
            elif 'token' in signin_data:
                token = signin_data['token']
            elif 'session' in signin_data and isinstance(signin_data['session'], dict):
                session_obj = signin_data['session']
                token = session_obj.get('accessToken') or session_obj.get('token') or session_obj.get('jwt')

        assert isinstance(token, str) and len(token) > 0, f"No valid token found in signin response: {signin_data}"

        headers = {"Authorization": f"Bearer {token}"}

        # Create a new document to review
        doc_payload = {
            "title": "Test Document for Review",
            "content": "This is test content for the document review endpoint.",
            "folderId": "default"  # Assuming "default" or some valid folderId; adjust as needed
        }
        create_resp = session.post(
            f"{BASE_URL}/api/documents",
            headers=headers,
            json=doc_payload,
            timeout=TIMEOUT
        )
        assert create_resp.status_code == 200, f"Document creation failed: {create_resp.text}"
        created_doc = create_resp.json()
        assert "id" in created_doc, "Created document does not contain 'id'"
        doc_id = created_doc["id"]

        # Send the document for review
        review_resp = session.post(
            f"{BASE_URL}/api/documents/{doc_id}/review",
            headers=headers,
            timeout=TIMEOUT
        )
        assert review_resp.status_code == 200, f"Reviewing document failed: {review_resp.text}"
        reviewed_doc = review_resp.json()
        assert "status" in reviewed_doc, "Reviewed document response missing status"
        assert reviewed_doc["status"] == "in review", f"Document status is not 'in review': {reviewed_doc['status']}"
        assert reviewed_doc.get("id") == doc_id, "Reviewed document ID mismatch"

    finally:
        # Clean up: delete the created document
        try:
            if 'doc_id' in locals():
                del_resp = session.delete(
                    f"{BASE_URL}/api/documents/{doc_id}",
                    headers=headers,
                    timeout=TIMEOUT
                )
                # It's optional to assert deletion success here; ignore errors
        except Exception:
            pass


test_post_api_documents_id_review_send_document_for_review()
