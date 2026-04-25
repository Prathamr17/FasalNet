"""
FasalNet v8 — Demo Data Seeder
Includes: farmer, operator, customer, delivery_boy
Run: python seed_demo.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from dotenv import load_dotenv
load_dotenv()
import psycopg2
from werkzeug.security import generate_password_hash
from config import Config

DEMO_USERS = [
    {"name":"Ramesh Jadhav",  "phone":"9000000001", "email":"ramesh@demo.com",   "password":"farmer123",   "role":"farmer",       "district":"Kolhapur", "state":"Maharashtra"},
    {"name":"Sunita Patil",   "phone":"9000000002", "email":"sunita@demo.com",   "password":"operator123", "role":"operator",     "district":"Kolhapur", "state":"Maharashtra"},
    {"name":"Arjun Mehta",    "phone":"9000000003", "email":"arjun@demo.com",    "password":"customer123", "role":"customer",     "district":"Pune",     "state":"Maharashtra"},
    {"name":"Ravi Kumar",     "phone":"9000000004", "email":"ravi@demo.com",     "password":"delivery123", "role":"delivery_boy", "district":"Kolhapur", "state":"Maharashtra"},
]

def seed():
    conn = psycopg2.connect(Config.DATABASE_URL)
    cur  = conn.cursor()
    print("Seeding demo users…")
    for u in DEMO_USERS:
        cur.execute("SELECT id FROM users WHERE phone=%s", (u["phone"],))
        if cur.fetchone():
            print(f"  ↳ {u['phone']} ({u['role']}) already exists, skipping.")
            continue
        pw = generate_password_hash(u["password"])
        cur.execute(
            """INSERT INTO users (name, phone, email, password_hash, role, district, state)
               VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
            (u["name"], u["phone"], u["email"], pw, u["role"], u["district"], u["state"])
        )
        new_id = cur.fetchone()[0]
        print(f"  ✓ Created {u['role']:12} {u['name']} (id={new_id})")
        if u["role"] == "operator":
            cur.execute("UPDATE storages SET operator_id=%s WHERE operator_id IS NULL", (new_id,))
            print(f"    → Assigned storages to operator id={new_id}")
    conn.commit(); cur.close(); conn.close()
    print("\nDone! Login credentials:")
    print("-" * 55)
    for u in DEMO_USERS:
        print(f"  {u['role']:12}  Phone: {u['phone']}  Password: {u['password']}")
    print("-" * 55)

if __name__ == "__main__":
    seed()
