from fastapi import APIRouter

from app.api.endpoints import (
    auth,
    customers,
    products_orders,
    tickets,
    notifications,
    admin,
    knowledge_base,
    inbound,
    ws
)

api_router = APIRouter()

# Authentication: mounted both with /auth and at root for full endpoint compatibility
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(auth.router, tags=["Authentication Direct"])
api_router.include_router(customers.router, prefix="/customers", tags=["Customers"])
api_router.include_router(products_orders.router, tags=["Products & Orders"])
api_router.include_router(tickets.router, prefix="/tickets", tags=["Tickets"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
api_router.include_router(knowledge_base.router, prefix="/knowledge-base", tags=["Knowledge Base"])
api_router.include_router(inbound.router, prefix="/inbound", tags=["Inbound Email"])
api_router.include_router(ws.router, prefix="/ws", tags=["WebSockets"])
