import os
import sys
from datetime import datetime, timedelta

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal, init_db
from app.core.security import get_password_hash
from app.models.entities import (
    User, UserProfile, Role, Permission, Product, Order, OrderItem,
    Ticket, TicketCategory, TicketMessage, TicketStatusHistory,
    TicketFeedback, SLAPolicy, KnowledgeBaseArticle, AgentAvailability,
    CompanySettings, NotificationPreference, EmailLog
)

def run_seed():
    print("Initializing database tables...")
    init_db()
    db = SessionLocal()

    try:
        # 1. Company Settings
        company = db.query(CompanySettings).first()
        if not company:
            company = CompanySettings(
                company_name="Trasol Technologies",
                company_logo="/logo.svg",
                owner_notification_email="owner@trasol.tech",
                support_inbox_email="support@trasol.tech",
                agent_notification_emails="support-team@trasol.tech",
                brevo_api_key="",
                brevo_sender_email="support@trasol.tech",
                brevo_sender_name="Trasol Technologies Support",
                support_contact_details="+1 (800) 555-0199 | support@trasol.tech | 100 Technology Plaza, San Francisco, CA"
            )
            db.add(company)
            print("Company settings created.")

        # 2. SLA Policies
        sla_data = [
            ("Critical", 0.25, 4.0, 2.0),
            ("High", 1.0, 12.0, 6.0),
            ("Medium", 4.0, 24.0, 12.0),
            ("Low", 8.0, 48.0, 24.0),
        ]
        for prio, resp_h, res_h, esc_h in sla_data:
            existing = db.query(SLAPolicy).filter(SLAPolicy.priority == prio).first()
            if not existing:
                sla = SLAPolicy(
                    priority=prio,
                    first_response_hours=resp_h,
                    resolution_hours=res_h,
                    escalation_hours=esc_h,
                    is_active=True
                )
                db.add(sla)
        print("SLA policies verified.")

        # 3. Roles
        roles = ["customer", "agent", "admin", "super_admin"]
        for r_name in roles:
            if not db.query(Role).filter(Role.name == r_name).first():
                db.add(Role(name=r_name, description=f"Role for {r_name}"))

        # 4. Users: Super Admin, Admin, 3 Agents, 5 Customers
        users_to_create = [
            # Super Admin
            ("superadmin@trasol.tech", "Super Admin", "Admin@12345", "super_admin", "+1-555-0001", "Executive Management"),
            # Admins
            ("admin@trasol.com", "Trasol Admin", "trasol2026", "admin", "+1-555-0003", "System Operations"),
            ("admin@trasol.tech", "Operations Admin", "Admin@12345", "admin", "+1-555-0002", "Customer Operations"),
            # Agents
            ("agent.sarah@trasol.tech", "Sarah Jenkins", "Agent@12345", "agent", "+1-555-0101", "Hardware Diagnostics"),
            ("agent.david@trasol.tech", "David Miller", "Agent@12345", "agent", "+1-555-0102", "Billing & Subscriptions"),
            ("agent.priya@trasol.tech", "Priya Sharma", "Agent@12345", "agent", "+1-555-0103", "Enterprise Support"),
            # Customers
            ("customer.john@example.com", "John Doe", "Customer@12345", "customer", "+1-555-0201", "Nexus Corp"),
            ("customer.emma@example.com", "Emma Watson", "Customer@12345", "customer", "+1-555-0202", "Apex Logistics"),
            ("customer.michael@example.com", "Michael Chang", "Customer@12345", "customer", "+1-555-0203", "Chang BioTech"),
            ("customer.sophia@example.com", "Sophia Rodriguez", "Customer@12345", "customer", "+1-555-0204", "Vanguard Industries"),
            ("customer.alex@example.com", "Alex Turner", "Customer@12345", "customer", "+1-555-0205", "Turner Retail")
        ]

        created_users = {}
        for email, name, pw, role, phone, dept in users_to_create:
            user = db.query(User).filter(User.email == email).first()
            if not user:
                user = User(
                    email=email,
                    hashed_password=get_password_hash(pw),
                    full_name=name,
                    phone=phone,
                    role=role,
                    is_active=True,
                    is_verified=True
                )
                db.add(user)
                db.commit()
                db.refresh(user)

                profile = UserProfile(user_id=user.id, department=dept, company_name=dept if role == "customer" else "Trasol Technologies")
                notif_pref = NotificationPreference(user_id=user.id)
                db.add(profile)
                db.add(notif_pref)

                if role == "agent":
                    avail = AgentAvailability(user_id=user.id, is_available=True, max_tickets=15, current_ticket_count=0)
                    db.add(avail)

                db.commit()
            created_users[email] = user

        print(f"Users verified ({len(created_users)} users).")

        # 5. Products (10 Sample Products)
        products_data = [
            ("Enterprise IoT Edge Gateway Pro", "TR-GW-9000", "High-performance industrial gateway with dual SIM LTE-M, 4x Gigabit Ethernet, and secure cryptoprocessor.", 599.00, 24),
            ("Trasol AI Thermal Vision Camera 4K", "TR-CAM-4K", "Continuous radiometric temperature detection camera with built-in neural processing for facility monitoring.", 1249.00, 36),
            ("UltraSecure Hardware Token Y4", "TR-SEC-Y4", "FIDO2 / U2F certified hardware security key with biometric fingerprint authentication and NFC.", 89.00, 12),
            ("Smart Asset Tracker GPS-X", "TR-TRK-GPS", "Rechargeable asset GPS tracker with 5-year battery life, shock detection, and satellite fallback.", 179.00, 12),
            ("Industrial PoE Managed Switch 16-Port", "TR-SW-16P", "Ruggedized DIN-rail 16-port Gigabit PoE+ switch engineered for harsh industrial environments (-40C to 75C).", 420.00, 24),
            ("Wireless Sensor Node Mesh 900", "TR-SN-M900", "Long-range Sub-1GHz sensor node for vibration, ambient temperature, and humidity telematics.", 149.00, 12),
            ("Cloud Data Logger Micro v3", "TR-LOG-V3", "Compact multi-channel analog and digital data logger with MQTT and cloud sync engine.", 289.00, 18),
            ("Smart Environmental Monitor EnvoSense", "TR-ENV-200", "Continuous air quality monitor measuring CO2, TVOC, PM2.5, temperature, and relative humidity.", 219.00, 12),
            ("Rugged Field Diagnostic Tablet 10-Inch", "TR-TAB-10R", "MIL-STD-810H and IP67 certified tablet with sunlight-readable display and hot-swappable battery.", 950.00, 24),
            ("Compact Industrial Router LTE-M", "TR-RTR-LTE", "DIN-rail cellular router with automatic failover, VPN tunnel support, and dual SIM redundancy.", 340.00, 18),
        ]

        created_products = []
        for name, sku, desc, price, warranty in products_data:
            prod = db.query(Product).filter(Product.sku == sku).first()
            if not prod:
                prod = Product(
                    name=name,
                    sku=sku,
                    description=desc,
                    price=price,
                    warranty_months=warranty,
                    image_url=f"https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80",
                    is_active=True
                )
                db.add(prod)
                db.commit()
                db.refresh(prod)
            created_products.append(prod)

        print(f"Products verified ({len(created_products)} products).")

        # 6. Orders (10 Sample Orders)
        customers = [
            created_users["customer.john@example.com"],
            created_users["customer.emma@example.com"],
            created_users["customer.michael@example.com"],
            created_users["customer.sophia@example.com"],
            created_users["customer.alex@example.com"],
        ]

        created_orders = []
        for i in range(1, 11):
            ord_num = f"ORD-2026-{1000 + i}"
            existing_ord = db.query(Order).filter(Order.order_number == ord_num).first()
            if not existing_ord:
                cust = customers[(i - 1) % len(customers)]
                prod = created_products[(i - 1) % len(created_products)]
                qty = (i % 3) + 1
                total = prod.price * qty

                new_order = Order(
                    order_number=ord_num,
                    customer_id=cust.id,
                    total_amount=round(total, 2),
                    payment_status="paid",
                    order_status="completed",
                    shipping_address=f"Suite {100 + i}, Tech Blvd, Suite {i * 2}",
                    created_at=datetime.utcnow() - timedelta(days=20 - i)
                )
                db.add(new_order)
                db.commit()
                db.refresh(new_order)

                item = OrderItem(
                    order_id=new_order.id,
                    product_id=prod.id,
                    quantity=qty,
                    unit_price=prod.price
                )
                db.add(item)
                db.commit()
                created_orders.append(new_order)
            else:
                created_orders.append(existing_ord)

        print(f"Orders verified ({len(created_orders)} orders).")

        # 7. Tickets (15 Sample Tickets with various statuses, priorities, and conversations)
        sarah = created_users["agent.sarah@trasol.tech"]
        david = created_users["agent.david@trasol.tech"]
        priya = created_users["agent.priya@trasol.tech"]

        tickets_data = [
            # T1: Critical, In Progress, Edge Gateway
            ("Gateway losing LTE connectivity intermittently after firmware 2.4 update", "Product Defect", "Critical", "In Progress", 0, 0, sarah),
            # T2: High, Open, Thermal Camera
            ("Thermal calibration deviation exceeding ±2.5°C on sensor #2", "Technical Support", "High", "Open", 1, 1, None),
            # T3: Critical, Escalated, Hardware Token
            ("Urgent: Bulk Y4 tokens showing signature verification timeout on domain controller", "Security / Auth", "Critical", "Escalated", 2, 2, priya),
            # T4: Medium, Waiting for Customer, Asset Tracker
            ("GPS-X not transmitting telematics packets when GPS fix is acquired", "Delivery", "Medium", "Waiting for Customer", 3, 3, sarah),
            # T5: Low, Resolved, PoE Switch
            ("Query regarding VLAN trunking configuration syntax on Switch 16-Port", "Technical Support", "Low", "Resolved", 4, 4, priya),
            # T6: High, Assigned, Sensor Node Mesh
            ("Sensor mesh gateway drops packet buffers during burst reporting", "Product Defect", "High", "Assigned", 0, 5, sarah),
            # T7: Medium, In Progress, Data Logger
            ("Modbus RTU RS485 communication timeout on Channel 3", "Technical Support", "Medium", "In Progress", 1, 6, priya),
            # T8: Critical, Closed, Environmental Monitor
            ("EnvoSense sensor reporting incorrect particulate values in cleanroom lab", "Warranty", "Critical", "Closed", 2, 7, sarah),
            # T9: High, Open, Diagnostic Tablet
            ("Touchscreen unresponsive along right edge after cold temperature exposure", "Product Defect", "High", "Open", 3, 8, None),
            # T10: Low, Resolved, Industrial Router
            ("Inquiry about SIM card APN settings for international roaming", "Account Access", "Low", "Resolved", 4, 9, david),
            # T11: Medium, Reopened, Edge Gateway
            ("Reopened: Edge gateway still showing power LED yellow after capacitor replacement", "Product Defect", "Medium", "Reopened", 0, 0, sarah),
            # T12: Critical, In Progress, Thermal Camera
            ("CRITICAL: Camera RTSP streaming freeze during surveillance cycle", "Technical Support", "Critical", "In Progress", 1, 1, priya),
            # T13: High, Waiting for Customer, Hardware Token
            ("NFC reader compatibility with Android 14 enterprise devices", "Compatibility", "High", "Waiting for Customer", 2, 2, david),
            # T14: Low, Resolved, PoE Switch
            ("Request for updated CE / RoHS compliance certificates for audit", "Documentation", "Low", "Resolved", 3, 4, david),
            # T15: Medium, Assigned, Asset Tracker
            ("Asset tracker enclosure seal deformed upon unboxing package", "Delivery", "Medium", "Assigned", 4, 3, david)
        ]

        ticket_counter = 1
        for subject, cat, priority, status, cust_idx, prod_idx, agent in tickets_data:
            tkt_num = f"TKT-2026-{ticket_counter:06d}"
            existing_tkt = db.query(Ticket).filter(Ticket.ticket_number == tkt_num).first()
            if not existing_tkt:
                cust = customers[cust_idx]
                prod = created_products[prod_idx]
                order = created_orders[cust_idx]

                created_time = datetime.utcnow() - timedelta(days=15 - ticket_counter, hours=ticket_counter * 2)
                resolved_time = created_time + timedelta(hours=6) if status in ("Resolved", "Closed") else None

                t = Ticket(
                    ticket_number=tkt_num,
                    customer_id=cust.id,
                    order_id=order.id,
                    product_id=prod.id,
                    assigned_agent_id=agent.id if agent else None,
                    category=cat,
                    priority=priority,
                    status=status,
                    subject=subject,
                    description=f"Detailed incident report regarding {prod.name}. The issue was observed in active deployment. Immediate resolution requested.",
                    preferred_contact_method="email",
                    sla_deadline=created_time + timedelta(hours=4 if priority == "Critical" else (12 if priority == "High" else 24)),
                    first_response_at=created_time + timedelta(minutes=45) if agent else None,
                    resolved_at=resolved_time,
                    closed_at=resolved_time + timedelta(hours=12) if status == "Closed" else None,
                    is_escalated=(status == "Escalated"),
                    escalation_reason="Escalated due to enterprise critical impact" if status == "Escalated" else None,
                    created_at=created_time,
                    updated_at=datetime.utcnow() - timedelta(hours=ticket_counter)
                )
                db.add(t)
                db.commit()
                db.refresh(t)

                # Add sample conversation
                msg1 = TicketMessage(
                    ticket_id=t.id,
                    sender_id=cust.id,
                    sender_role="customer",
                    sender_name=cust.full_name,
                    content=f"Hello Trasol Support, we are experiencing {subject.lower()} with our {prod.name}. Please see details attached.",
                    is_internal=False,
                    is_read=True,
                    created_at=created_time
                )
                db.add(msg1)

                if agent:
                    # Internal note from agent
                    note = TicketMessage(
                        ticket_id=t.id,
                        sender_id=agent.id,
                        sender_role="agent",
                        sender_name=agent.full_name,
                        content=f"[INTERNAL STAFF NOTE] Reviewed telemetry logs. Signal-to-noise ratio is within threshold. Checking hardware batch {prod.sku}.",
                        is_internal=True,
                        is_read=True,
                        created_at=created_time + timedelta(minutes=30)
                    )
                    db.add(note)

                    # Public agent reply
                    msg2 = TicketMessage(
                        ticket_id=t.id,
                        sender_id=agent.id,
                        sender_role="agent",
                        sender_name=agent.full_name,
                        content=f"Hi {cust.full_name}, thank you for contacting Trasol Support. We have reproduced the scenario in our diagnostics bench. Our team is applying a patch.",
                        is_internal=False,
                        is_read=True,
                        created_at=created_time + timedelta(minutes=45)
                    )
                    db.add(msg2)

                # Feedback if resolved
                if status in ("Resolved", "Closed"):
                    fb = TicketFeedback(
                        ticket_id=t.id,
                        customer_id=cust.id,
                        rating=5 if ticket_counter % 2 == 0 else 4,
                        comments="Prompt and knowledgeable technical response. Issue was thoroughly resolved.",
                        created_at=resolved_time + timedelta(hours=1)
                    )
                    db.add(fb)

                # Seed sample email delivery logs
                log1 = EmailLog(
                    ticket_id=t.id,
                    recipient_email=cust.email,
                    recipient_type="customer",
                    email_type="ticket_created_customer",
                    subject=f"Your Support Ticket Has Been Created – {t.ticket_number}",
                    content_preview=f"Support ticket registered for {prod.name}",
                    delivery_status="SENT",
                    provider="simulation",
                    message_id=f"seed-{t.ticket_number}-cust",
                    created_at=created_time
                )
                log2 = EmailLog(
                    ticket_id=t.id,
                    recipient_email="owner@trasol.tech",
                    recipient_type="owner",
                    email_type="ticket_created_owner",
                    subject=f"New Customer Complaint Received – {t.ticket_number}",
                    content_preview=f"New ticket by {cust.full_name} for {prod.name}",
                    delivery_status="SENT",
                    provider="simulation",
                    message_id=f"seed-{t.ticket_number}-owner",
                    created_at=created_time
                )
                db.add(log1)
                db.add(log2)

                db.commit()

            ticket_counter += 1

        print("Tickets and conversations verified.")

        # 8. Knowledge Base Articles
        kb_data = [
            ("Connecting Trasol Edge Gateway to AWS IoT Core and Azure IoT", "gateways", "Gateways", "Step-by-step guide to provisioning X.509 device certificates and configuring MQTT endpoints on TR-GW-9000.", "aws, azure, mqtt, certificates"),
            ("Thermal Vision Camera Calibration Best Practices", "cameras", "Hardware", "Proper optical alignment and ambient emissivity compensation formulas to ensure ±0.3°C accuracy in industrial plants.", "thermal, calibration, camera"),
            ("Configuring FIDO2 Enterprise Authentication on Y4 Tokens", "tokens", "Security", "Instructions for enterprise domain administrators to register UltraSecure Y4 tokens with Microsoft Entra ID and Okta.", "fido2, token, security, sso"),
            ("Troubleshooting Sub-1GHz Sensor Mesh Network Latency", "mesh-network", "Networking", "Diagnosing interference, packet retry rates, and optimal repeater node placement in high-density steel environments.", "mesh, wireless, sensors"),
            ("SLA Response Times & Escalation Matrix Overview", "sla-matrix", "General", "Detailed documentation of Trasol Technologies standard support agreements, priority tiers (Critical, High, Medium, Low), and 24/7 emergency dispatch.", "sla, policies, support")
        ]

        for title, slug, cat, content, tags in kb_data:
            if not db.query(KnowledgeBaseArticle).filter(KnowledgeBaseArticle.slug == slug).first():
                art = KnowledgeBaseArticle(
                    title=title,
                    slug=slug,
                    category=cat,
                    content=content,
                    tags=tags,
                    is_published=True,
                    views_count=42,
                    helpful_count=18,
                    created_at=datetime.utcnow() - timedelta(days=30)
                )
                db.add(art)
        db.commit()
        print("Knowledge base articles verified.")

        print("\n=======================================================")
        print("SEEDING COMPLETE: Trasol SupportDesk 360")
        print("=======================================================")
        print("Demo Credentials:")
        print("1. Super Admin: superadmin@trasol.tech / Admin@12345")
        print("2. Admin:       admin@trasol.tech      / Admin@12345")
        print("3. Agents:      agent.sarah@trasol.tech / Agent@12345")
        print("                agent.david@trasol.tech / Agent@12345")
        print("                agent.priya@trasol.tech / Agent@12345")
        print("4. Customer:    customer.john@example.com / Customer@12345")
        print("=======================================================\n")

    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    run_seed()
