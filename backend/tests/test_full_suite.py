import os
import sys
import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Setup test environment
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.core.database import Base, get_db
from app.api.deps import get_db as deps_get_db
from app.main import app
from app.models.entities import User, Ticket, Order, EmailLog, InboundEmail, SLAPolicy, CompanySettings
from app.services.inbound_email_service import InboundEmailService

# Use isolated in-memory test SQLite db with StaticPool
from sqlalchemy.pool import StaticPool
test_engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[deps_get_db] = override_get_db

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    
    # Seed default SLA and company
    db = TestingSessionLocal()
    company = CompanySettings(
        company_name="Trasol Technologies",
        owner_notification_email="owner@trasol.tech",
        support_inbox_email="support@trasol.tech"
    )
    db.add(company)
    
    sla_data = [
        ("Critical", 0.25, 4.0, 2.0),
        ("High", 1.0, 12.0, 6.0),
        ("Medium", 4.0, 24.0, 12.0),
        ("Low", 8.0, 48.0, 24.0),
    ]
    for prio, resp_h, res_h, esc_h in sla_data:
        db.add(SLAPolicy(priority=prio, first_response_hours=resp_h, resolution_hours=res_h, escalation_hours=esc_h, is_active=True))
    db.commit()
    db.close()
    
    yield
    
    Base.metadata.drop_all(bind=test_engine)

client = TestClient(app)

def test_health_check():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"
    assert res.json()["company"] == "Trasol Technologies"

def test_user_registration_and_login():
    # 1. Register customer
    reg_payload = {
        "full_name": "Test Customer Alice",
        "email": "alice.test@example.com",
        "password": "SecurePassword123!",
        "phone": "+1-555-9988",
        "terms_accepted": True
    }
    reg_res = client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_res.status_code == 201
    data = reg_res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "alice.test@example.com"
    assert data["user"]["role"] == "customer"

    # 2. Login with valid credentials
    login_res = client.post("/api/v1/auth/login", json={
        "email": "alice.test@example.com",
        "password": "SecurePassword123!"
    })
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert "access_token" in login_data

    # 3. Reject invalid credentials
    bad_login = client.post("/api/v1/auth/login", json={
        "email": "alice.test@example.com",
        "password": "WrongPassword!"
    })
    assert bad_login.status_code == 401

def test_mock_checkout_order_creation():
    # Login customer
    login_res = client.post("/api/v1/auth/login", json={
        "email": "alice.test@example.com",
        "password": "SecurePassword123!"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # First, create a product in db
    db = TestingSessionLocal()
    from app.models.entities import Product
    prod = Product(name="IoT Gateway Alpha", sku="SKU-TEST-01", price=199.99, warranty_months=24, is_active=True)
    db.add(prod)
    db.commit()
    db.refresh(prod)
    prod_id = prod.id
    db.close()

    # Checkout
    order_res = client.post("/api/v1/orders", headers=headers, json={
        "items": [{"product_id": prod_id, "quantity": 2}],
        "shipping_address": "777 Innovation Way"
    })
    assert order_res.status_code == 201
    order_data = order_res.json()
    assert order_data["order_number"].startswith("ORD-")
    assert order_data["total_amount"] == 399.98
    assert len(order_data["items"]) == 1

def test_ticket_creation_and_automatic_emails():
    # Login customer
    login_res = client.post("/api/v1/auth/login", json={
        "email": "alice.test@example.com",
        "password": "SecurePassword123!"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Get order
    orders_res = client.get("/api/v1/customers/me/orders", headers=headers)
    assert orders_res.status_code == 200
    orders = orders_res.json()
    order_id = orders[0]["id"]
    product_id = orders[0]["items"][0]["product_id"]

    # Raise ticket
    ticket_payload = {
        "subject": "Device failing to connect to MQTT broker",
        "category": "Product Defect",
        "priority": "High",
        "description": "The device powers on but drops connection every 5 minutes.",
        "order_id": order_id,
        "product_id": product_id,
        "preferred_contact_method": "email"
    }
    tkt_res = client.post("/api/v1/tickets", headers=headers, json=ticket_payload)
    assert tkt_res.status_code == 201
    tkt_data = tkt_res.json()
    assert tkt_data["ticket_number"].startswith("TKT-")
    assert tkt_data["priority"] == "High"
    assert tkt_data["status"] in ("Open", "Assigned")

    # Verify 2 distinct emails generated and saved in database email_logs:
    # 1. Customer confirmation
    # 2. Company owner new-ticket alert
    db = TestingSessionLocal()
    email_logs = db.query(EmailLog).filter(EmailLog.ticket_id == tkt_data["id"]).all()
    assert len(email_logs) >= 2
    types = [el.email_type for el in email_logs]
    assert "ticket_created_customer" in types
    assert "ticket_created_owner" in types
    db.close()

def test_agent_conversation_and_internal_notes():
    db = TestingSessionLocal()
    from app.core.security import get_password_hash
    # Create support agent
    agent = User(
        email="agent.bob@trasol.tech",
        hashed_password=get_password_hash("AgentPass123!"),
        full_name="Bob Agent",
        role="agent",
        is_active=True,
        is_verified=True
    )
    # Create another customer
    charlie = User(
        email="charlie@example.com",
        hashed_password=get_password_hash("CustomerPass123!"),
        full_name="Charlie Customer",
        role="customer",
        is_active=True,
        is_verified=True
    )
    db.add(agent)
    db.add(charlie)
    db.commit()
    db.close()

    # Agent login
    ag_login = client.post("/api/v1/auth/login", json={"email": "agent.bob@trasol.tech", "password": "AgentPass123!"})
    agent_token = ag_login.json()["access_token"]
    agent_headers = {"Authorization": f"Bearer {agent_token}"}

    # Charlie login
    ch_login = client.post("/api/v1/auth/login", json={"email": "charlie@example.com", "password": "CustomerPass123!"})
    charlie_token = ch_login.json()["access_token"]
    charlie_headers = {"Authorization": f"Bearer {charlie_token}"}

    # Alice ticket ID
    alice_login = client.post("/api/v1/auth/login", json={"email": "alice.test@example.com", "password": "SecurePassword123!"})
    alice_token = alice_login.json()["access_token"]
    alice_headers = {"Authorization": f"Bearer {alice_token}"}
    alice_tkts = client.get("/api/v1/tickets", headers=alice_headers).json()
    ticket_id = alice_tkts[0]["id"]

    # Charlie tries to view Alice's ticket -> FORBIDDEN
    forbidden_res = client.get(f"/api/v1/tickets/{ticket_id}", headers=charlie_headers)
    assert forbidden_res.status_code == 403

    # Agent posts public reply
    reply_res = client.post(f"/api/v1/tickets/{ticket_id}/messages", headers=agent_headers, json={
        "content": "We have checked the MQTT server logs. Please verify your port 8883 SSL configuration.",
        "is_internal": False
    })
    assert reply_res.status_code == 200

    # Agent posts internal note
    note_res = client.post(f"/api/v1/tickets/{ticket_id}/messages", headers=agent_headers, json={
        "content": "[SECRET NOTE] Hardware rev B has an issue with cipher suites on port 8883.",
        "is_internal": True
    })
    assert note_res.status_code == 200

    # Alice views ticket detail -> MUST NOT see internal note!
    alice_view = client.get(f"/api/v1/tickets/{ticket_id}", headers=alice_headers).json()
    alice_messages = alice_view["messages"]
    internal_found = any(m["is_internal"] for m in alice_messages)
    assert internal_found is False, "Security failure: Customer can see internal staff note!"

    # Agent views ticket detail -> CAN see internal note
    agent_view = client.get(f"/api/v1/tickets/{ticket_id}", headers=agent_headers).json()
    agent_messages = agent_view["messages"]
    agent_internal_found = any(m["is_internal"] for m in agent_messages)
    assert agent_internal_found is True

    # Resolve ticket
    res_ticket = client.post(f"/api/v1/tickets/{ticket_id}/resolve", headers=agent_headers)
    assert res_ticket.status_code == 200
    assert res_ticket.json()["status"] == "Resolved"

    # Alice submits 5-star rating
    fb_res = client.post(f"/api/v1/tickets/{ticket_id}/feedback", headers=alice_headers, json={
        "rating": 5,
        "comments": "Super fast and helpful assistance!"
    })
    assert fb_res.status_code == 200
    assert fb_res.json()["rating"] == 5

def test_inbound_email_matching():
    db = TestingSessionLocal()
    alice_ticket = db.query(Ticket).first()
    tkt_num = alice_ticket.ticket_number
    db.close()

    # Inbound email with subject: Re: [TKT-2026-000001] Port 8883 query
    webhook_res = client.post("/api/v1/inbound/webhook", json={
        "sender_email": "alice.test@example.com",
        "sender_name": "Alice Customer",
        "subject": f"Re: [{tkt_num}] Port 8883 query",
        "body": "Thank you, updating the port to 8883 resolved my issue completely!",
        "message_id": "test-msg-id-12345"
    })
    assert webhook_res.status_code == 200
    data = webhook_res.json()
    assert data["status"] == "matched_and_appended"
    assert data["ticket_number"] == tkt_num

    # Duplicate message ID should be skipped
    dup_res = client.post("/api/v1/inbound/webhook", json={
        "sender_email": "alice.test@example.com",
        "sender_name": "Alice Customer",
        "subject": f"Re: [{tkt_num}] Port 8883 query",
        "body": "Duplicate send",
        "message_id": "test-msg-id-12345"
    })
    assert dup_res.status_code == 200
    assert dup_res.json()["status"] == "duplicate_skipped"
