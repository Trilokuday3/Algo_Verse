import base64
import json
import datetime

token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJpc3MiOiJkaGFuIiwicGFydG5lcklkIjoiIiwiZXhwIjoxNzYzMjM1NTA4LCJpYXQiOjE3NjMxNDkxMDgsInRva2VuQ29uc3VtZXJUeXBlIjoiU0VMRiIsIndlYmhvb2tVcmwiOiIiLCJkaGFuQ2xpZW50SWQiOiIxMTA4MTE3OTEwIn0.iSSF_jZZ2V-V89K6PgCvEeFCBTy3zM_HZH40CsjtqFZuQkyMdKcrKUHPyTZ3fYwv3rMMaLPg4hkVjPZecjAl7A"

# Decode JWT payload
parts = token.split('.')
payload = parts[1]
# Add padding if needed
payload += '=' * (4 - len(payload) % 4)
decoded = json.loads(base64.urlsafe_b64decode(payload))

exp_timestamp = decoded['exp']
exp_date = datetime.datetime.fromtimestamp(exp_timestamp)
now = datetime.datetime.now()

print(f"Token issued:  {datetime.datetime.fromtimestamp(decoded['iat'])}")
print(f"Token expires: {exp_date}")
print(f"Current time:  {now}")
print(f"\nDhan Client ID: {decoded.get('dhanClientId', 'N/A')}")

if exp_date < now:
    print("\n❌ TOKEN EXPIRED!")
    print(f"Expired {(now - exp_date).days} days ago")
else:
    print("\n✅ TOKEN VALID")
    print(f"Expires in {(exp_date - now).days} days")
