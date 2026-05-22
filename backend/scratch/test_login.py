import requests

def test_login():
    url = "http://127.0.0.1:8000/login"
    data = {
        "username": "sathishkupps@gmail.com",
        "password": "string" # I noticed in the screenshot they entered 'string' as password
    }
    print(f"Testing login for {data['username']}...")
    try:
        response = requests.post(url, data=data)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_login()
