import requests

BASE_URL = "http://localhost:3000"
AUTH_USERNAME = "john@doe.com"
AUTH_PASSWORD = "johndoe123"
TIMEOUT = 30

def test_post_api_documents_id_approve_approve_document():
    session = requests.Session()
    doc_id = None
    try:
        # Step 1: Sign in to get JWT token
        signin_resp = session.post(
            f"{BASE_URL}/api/auth/signin",
            json={"email": AUTH_USERNAME, "password": AUTH_PASSWORD},
            timeout=TIMEOUT
        )
        assert signin_resp.status_code == 200, f"Signin failed: {signin_resp.text}"
        # Parse JSON safely
        try:
            json_resp = signin_resp.json()
        except Exception as e:
            assert False, f"Signin response is not valid JSON: {signin_resp.text}"
        token = json_resp.get("token")
        if not token:
            token = json_resp.get("accessToken")
        assert token, "Authentication token not found in signin response"
        headers = {"Authorization": f"Bearer {token}"}

        # Step 2: Create a new document to approve
        create_doc_payload = {
            "title": "Test Document for Approval",
            "content": "This document is created for approval test.",
            "folderId": "default-folder"
        }
        create_resp = session.post(
            f"{BASE_URL}/api/documents",
            json=create_doc_payload,
            headers=headers,
            timeout=TIMEOUT
        )
        assert create_resp.status_code == 200, f"Document creation failed: {create_resp.text}"
        document = create_resp.json()
        doc_id = document.get("id")
        assert doc_id, "Created document ID not found"

        # Step 3: Send document for review (to change status to 'in review')
        review_resp = session.post(
            f"{BASE_URL}/api/documents/{doc_id}/review",
            headers=headers,
            timeout=TIMEOUT
        )
        assert review_resp.status_code == 200, f"Sending document for review failed: {review_resp.text}"
        review_doc = review_resp.json()
        assert review_doc.get("status") == "in review", f"Document status expected 'in review', got: {review_doc.get('status')}"

        # Step 4: Approve document (change status to 'published')
        approve_resp = session.post(
            f"{BASE_URL}/api/documents/{doc_id}/approve",
            headers=headers,
            timeout=TIMEOUT
        )
        if approve_resp.status_code == 200:
            approved_doc = approve_resp.json()
            assert approved_doc.get("status") == "published", f"Document status expected 'published', got: {approved_doc.get('status')}"
        else:
            # Handle invalid state error (likely 400 or 409)
            assert approve_resp.status_code in (400, 409), f"Unexpected error code on approve: {approve_resp.status_code}"
            error_resp = approve_resp.json()
            assert "error" in error_resp or "message" in error_resp, f"Expected error message in response: {approve_resp.text}"

    finally:
        # Clean up: delete created document if possible
        if doc_id is not None:
            try:
                del_resp = session.delete(
                    f"{BASE_URL}/api/documents/{doc_id}",
                    headers=headers,
                    timeout=TIMEOUT
                )
                assert del_resp.status_code == 200, f"Document deletion failed: {del_resp.text}"
            except Exception:
                # If deletion fails, ignore for cleanup
                pass

test_post_api_documents_id_approve_approve_document()
