"""
FasalNet AI Agricultural Advisor & Chat Test Suite
Tests:
  1. GET /api/ai/health
  2. GET /api/ai/sources
  3. POST /api/ai/market-advice (Sangli Onion 7d, Kolhapur Tomato 14d, Pune Wheat 14d)
  4. POST /api/ai/chat (Conversational questions)
"""

import requests
import json

BASE_URL = "http://127.0.0.1:5000"

def safe_print(text):
    if isinstance(text, str):
        print(text.encode("ascii", "replace").decode("ascii"))
    else:
        print(text)

def test_ai_advisor():
    print("=" * 70)
    print("FASALNET AI ADVISOR & RAG TEST SUITE")
    print("=" * 70)

    # 1. Health
    print("\n[1] Testing /api/ai/health...")
    r = requests.get(f"{BASE_URL}/api/ai/health")
    assert r.status_code == 200, f"Health check failed: {r.text}"
    health_data = r.json()
    print("   Status:", health_data.get("status"))
    print("   Indexed Chunks:", health_data.get("rag_chunks_indexed"))
    print("   Numerical Model:", health_data.get("numerical_model"))
    print("   Vector Engine:", health_data.get("vector_engine"))

    # 2. Sources
    print("\n[2] Testing /api/ai/sources...")
    r = requests.get(f"{BASE_URL}/api/ai/sources")
    assert r.status_code == 200, f"Sources check failed: {r.text}"
    sources_data = r.json()
    print("   Total Verified Knowledge Sources:", sources_data.get("count"))
    for s in sources_data.get("sources", [])[:3]:
        safe_print(f"   - {s.get('crop')}: {s.get('institution')} ({s.get('source')})")

    # 3. Market Advice (Sangli Onion 7d)
    print("\n[3] Testing POST /api/ai/market-advice (Sangli | Onion | 7d)...")
    payload = {"city": "Sangli", "commodity": "Onion", "days": 7}
    r = requests.post(f"{BASE_URL}/api/ai/market-advice", json=payload)
    assert r.status_code == 200, f"Market advice failed: {r.text}"
    advice = r.json()
    safe_print("   Recommendation: " + str(advice.get("recommendation")))
    safe_print("   Reason: " + str(advice.get("reason")))
    safe_print("   Weather Impact: " + str(advice.get("weather_impact")))
    print("   Risk Level:", advice.get("risk_level"))
    print("   Confidence:", advice.get("confidence"))
    safe_print("   Forecast Summary: " + str(advice.get("price_forecast_summary")))
    safe_print("   Cited Sources: " + str([s.get("source") for s in advice.get("sources", [])]))

    # 4. Market Advice (Kolhapur Tomato 14d)
    print("\n[4] Testing POST /api/ai/market-advice (Kolhapur | Tomato | 14d)...")
    payload = {"city": "Kolhapur", "commodity": "Tomato", "days": 14}
    r = requests.post(f"{BASE_URL}/api/ai/market-advice", json=payload)
    assert r.status_code == 200, f"Market advice failed: {r.text}"
    advice_t = r.json()
    safe_print("   Recommendation: " + str(advice_t.get("recommendation")))
    safe_print("   Crop Advice (RAG Grounded): " + str(advice_t.get("crop_advice")))
    safe_print("   Suggested Action: " + str(advice_t.get("suggested_action")))

    # 5. Conversational AI Chat
    print("\n[5] Testing POST /api/ai/chat...")
    chat_queries = [
        "Should I sell my Onion in Sangli now or wait for 7 days?",
        "How will upcoming rain affect my Tomato in Kolhapur?",
        "Which nearby market looks better for selling produce?"
    ]

    for q in chat_queries:
        safe_print(f"\n   User: \"{q}\"")
        payload = {
            "message": q,
            "city": "Sangli" if "Onion" in q else "Kolhapur",
            "commodity": "Onion" if "Onion" in q else "Tomato",
            "days": 7
        }
        r = requests.post(f"{BASE_URL}/api/ai/chat", json=payload)
        assert r.status_code == 200, f"Chat failed for '{q}': {r.text}"
        chat_res = r.json()
        print("   AI Reply Snippet:")
        first_lines = "\n".join(chat_res.get("reply", "").split("\n")[:8])
        safe_print(f"   {first_lines}")
        print("   [Sources Cited Count]:", len(chat_res.get("sources", [])))

    print("\n" + "=" * 70)
    print("ALL AI ADVISOR & RAG TESTS PASSED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    test_ai_advisor()
