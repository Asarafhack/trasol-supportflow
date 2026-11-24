import os
import sys
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import httpx

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("STARTING TEST RUNNER SCRIPT", flush=True)

from app.main import app
from app.core.database import SessionLocal, init_db
from app.models.entities import User, Ticket, Order, EmailLog, Product

async def run_tests():
    print("Initializing test database...", flush=True)
    init_db()

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        print("1. Testing health check...", flush=True)
        res = await client.get("/health")
        print("Health check response:", res.status_code, res.json(), flush=True)
        assert res.status_code == 200

        print("2. Testing products list...", flush=True)
        res = await client.get("/api/v1/products")
        products = res.json()
        print("Products count:", len(products), flush=True)
        assert res.status_code == 200
        assert len(products) > 0

        print("3. Testing admin login...", flush=True)
        res = await client.post("/api/v1/auth/login", json={
            "email": "admin@trasol.tech",
            "password": "Admin@12345"
        })
        print("Admin login status:", res.status_code, flush=True)
        assert res.status_code == 200
        admin_token = res.json()["access_token"]

        print("4. Testing admin dashboard statistics...", flush=True)
        res = await client.get("/api/v1/admin/dashboard", headers={"Authorization": f"Bearer {admin_token}"})
        stats = res.json()
        print("Dashboard stats:", res.status_code, "Total tickets:", stats.get("total_tickets"), flush=True)
        assert res.status_code == 200

        print("5. Testing customer login...", flush=True)
        res = await client.post("/api/v1/auth/login", json={
            "email": "customer.john@example.com",
            "password": "Customer@12345"
        })
        print("Customer login status:", res.status_code, flush=True)
        assert res.status_code == 200
        customer_token = res.json()["access_token"]

        print("6. Testing customer order creation (mock checkout)...", flush=True)
        db = SessionLocal()
        prod = db.query(Product).first()
        prod_id = prod.id
        db.close()

        res = await client.post("/api/v1/orders", headers={"Authorization": f"Bearer {customer_token}"}, json={
            "items": [{"product_id": prod_id, "quantity": 1}],
            "shipping_address": "456 Market St, San Francisco, CA"
        })
        order_data = res.json()
        print("Order creation status:", res.status_code, "Order number:", order_data.get("order_number"), flush=True)
        assert res.status_code == 201
        new_order_id = order_data["id"]

        print("7. Testing ticket creation with automated dual-email generation...", flush=True)
        res = await client.post("/api/v1/tickets", headers={"Authorization": f"Bearer {customer_token}"}, json={
            "subject": "E2E Test: Gateway fails to authenticate with MQTT cloud broker",
            "category": "Technical Support",
            "priority": "High",
            "description": "Observed intermittent timeout during live simulation.",
            "order_id": new_order_id,
            "product_id": prod_id,
            "preferred_contact_method": "email"
        })
        print("Ticket creation status:", res.status_code, "Ticket Number:", res.json().get("ticket_number"), flush=True)
        assert res.status_code == 201
        ticket_data = res.json()
        ticket_id = ticket_data["id"]

        print("8. Verifying email logs in database...", flush=True)
        db = SessionLocal()
        email_logs = db.query(EmailLog).filter(EmailLog.ticket_id == ticket_id).all()
        print(f"Generated {len(email_logs)} email log records:", flush=True)
        for el in email_logs:
            print(f"  - [{el.delivery_status}] Type: {el.email_type} | To: {el.recipient_email} | Subject: {el.subject}", flush=True)
        assert len(email_logs) >= 2
        db.close()

        print("9. Testing Agent reply & internal staff note...", flush=True)
        agent_res = await client.post("/api/v1/auth/login", json={
            "email": "agent.sarah@trasol.tech",
            "password": "Agent@12345"
        })
        agent_token = agent_res.json()["access_token"]

        # Post public agent reply
        reply_res = await client.post(f"/api/v1/tickets/{ticket_id}/messages", headers={"Authorization": f"Bearer {agent_token}"}, json={
            "content": "Hi John, we have reviewed your broker logs and refreshed the telemetry key.",
            "is_internal": False
        })
        print("Agent reply status:", reply_res.status_code, flush=True)
        assert reply_res.status_code == 200

        # Post internal note (staff only)
        note_res = await client.post(f"/api/v1/tickets/{ticket_id}/messages", headers={"Authorization": f"Bearer {agent_token}"}, json={
            "content": "[INTERNAL STAFF ONLY] Cipher mismatch resolved on port 8883 cluster.",
            "is_internal": True
        })
        print("Internal note status:", note_res.status_code, flush=True)
        assert note_res.status_code == 200

        # Verify customer CANNOT see internal staff note
        cust_view_res = await client.get(f"/api/v1/tickets/{ticket_id}", headers={"Authorization": f"Bearer {customer_token}"})
        cust_view = cust_view_res.json()
        internal_notes_in_cust_view = [m for m in cust_view["messages"] if m["is_internal"]]
        print("Internal notes visible to customer:", len(internal_notes_in_cust_view), flush=True)
        assert len(internal_notes_in_cust_view) == 0, "Security Violation: Internal note leaked to customer!"

        print("10. Testing ticket resolution and customer feedback...", flush=True)
        res_tkt = await client.post(f"/api/v1/tickets/{ticket_id}/resolve", headers={"Authorization": f"Bearer {agent_token}"})
        print("Resolution status:", res_tkt.status_code, "New status:", res_tkt.json()["status"], flush=True)
        assert res_tkt.status_code == 200
        assert res_tkt.json()["status"] == "Resolved"

        # Customer feedback
        fb_res = await client.post(f"/api/v1/tickets/{ticket_id}/feedback", headers={"Authorization": f"Bearer {customer_token}"}, json={
            "rating": 5,
            "comments": "Outstanding technical support and prompt turnaround."
        })
        print("Feedback submission status:", fb_res.status_code, "Rating:", fb_res.json()["rating"], flush=True)
        assert fb_res.status_code == 200

        print("11. Testing inbound email parser and reply ingestion...", flush=True)
        tkt_num = ticket_data["ticket_number"]
        inbound_res = await client.post("/api/v1/inbound/webhook", json={
            "sender_email": "customer.john@example.com",
            "sender_name": "John Doe",
            "subject": f"Re: [{tkt_num}] Gateway connection resolved",
            "body": "Confirming that everything works great now! Thank you Sarah.",
            "message_id": f"msg-e2e-{tkt_num}"
        })
        print("Inbound email webhook status:", inbound_res.status_code, inbound_res.json(), flush=True)
        assert inbound_res.status_code == 200
        assert inbound_res.json()["status"] == "matched_and_appended"

        print("\n=======================================================", flush=True)
        print("ALL 11 END-TO-END INTEGRATION TESTS PASSED 100%!", flush=True)
        print("=======================================================\n", flush=True)

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(run_tests())
