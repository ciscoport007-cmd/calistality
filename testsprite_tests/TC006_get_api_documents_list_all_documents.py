import requests

BASE_URL = "http://localhost:3000"
USERNAME = "john@doe.com"
PASSWORD = "johndoe123"
TIMEOUT = 30

def test_get_api_documents_list_all_documents():
    signin_url = f"{BASE_URL}/api/auth/signin"
    documents_url = f"{BASE_URL}/api/documents"
    session = requests.Session()

    # Step 1: Authenticate and get Bearer token
    try:
        signin_response = session.post(
            signin_url,
            json={"email": USERNAME, "password": PASSWORD},
            headers={"Content-Type": "application/json"},
            timeout=TIMEOUT
        )
        assert signin_response.status_code == 200, f"Signin failed: {signin_response.text}"
        content_type = signin_response.headers.get('Content-Type', '')
        assert 'application/json' in content_type, f"Signin response not JSON: {signin_response.text}"
        signin_data = signin_response.json()
        token = signin_data.get("accessToken")
        assert token, "No token found in signin response"

        headers = {
            "Authorization": f"Bearer {token}"
        }

        # Step 2: GET /api/documents with valid authorization
        response = session.get(documents_url, headers=headers, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected status 200, got {response.status_code}"

        documents = response.json()
        assert isinstance(documents, list), "Response should be a list of documents"

        # Optionally verify keys of documents if any in the list
        if len(documents) > 0:
            for doc in documents:
                assert isinstance(doc, dict), "Each document should be a dict"
                # Basic required keys check (approximate, fields not fully specified in PRD)
                assert "id" in doc or "ID" in doc, "Document should have an id field"
                assert "title" in doc or "Title" in doc, "Document should have a title field"

    finally:
        session.close()


test_get_api_documents_list_all_documents()
