import random
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, require_admin
from app.models.entities import Product, Order, OrderItem, User
from app.schemas.schemas import ProductOut, ProductCreate, OrderOut, OrderCreate

router = APIRouter()

@router.get("/products", response_model=List[ProductOut])
async def list_products(db: Session = Depends(get_db)):
    return db.query(Product).filter(Product.is_active == True).all()

@router.get("/products/{product_id}", response_model=ProductOut)
async def get_product(product_id: str, db: Session = Depends(get_db)):
    prod = db.query(Product).filter(Product.id == product_id).first()
    if not prod:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")
    return prod

@router.post("/products", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
async def create_product(
    prod_in: ProductCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    existing = db.query(Product).filter(Product.sku == prod_in.sku).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="SKU already exists.")

    product = Product(
        name=prod_in.name,
        sku=prod_in.sku,
        description=prod_in.description,
        image_url=prod_in.image_url,
        price=prod_in.price,
        warranty_months=prod_in.warranty_months,
        is_active=True
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product

@router.get("/orders", response_model=List[OrderOut])
async def list_orders(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(Order)
    if current_user.role == "customer":
        query = query.filter(Order.customer_id == current_user.id)
    orders = query.order_by(Order.created_at.desc()).all()

    results = []
    for o in orders:
        items = []
        for it in o.items:
            items.append({
                "id": it.id,
                "product_id": it.product_id,
                "product_name": it.product.name if it.product else "Product",
                "product_sku": it.product.sku if it.product else "",
                "product_image": it.product.image_url if it.product else None,
                "quantity": it.quantity,
                "unit_price": it.unit_price
            })
        results.append({
            "id": o.id,
            "order_number": o.order_number,
            "customer_id": o.customer_id,
            "customer_name": o.customer.full_name if o.customer else "Unknown",
            "total_amount": o.total_amount,
            "payment_status": o.payment_status,
            "order_status": o.order_status,
            "shipping_address": o.shipping_address,
            "created_at": o.created_at,
            "items": items
        })
    return results

@router.get("/orders/{order_id}", response_model=OrderOut)
async def get_order(order_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")
    
    if current_user.role == "customer" and order.customer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to view this order.")

    items = []
    for it in order.items:
        items.append({
            "id": it.id,
            "product_id": it.product_id,
            "product_name": it.product.name if it.product else "Product",
            "product_sku": it.product.sku if it.product else "",
            "product_image": it.product.image_url if it.product else None,
            "quantity": it.quantity,
            "unit_price": it.unit_price
        })

    return {
        "id": order.id,
        "order_number": order.order_number,
        "customer_id": order.customer_id,
        "customer_name": order.customer.full_name if order.customer else "Customer",
        "total_amount": order.total_amount,
        "payment_status": order.payment_status,
        "order_status": order.order_status,
        "shipping_address": order.shipping_address,
        "created_at": order.created_at,
        "items": items
    }

@router.post("/orders", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
async def mock_checkout_create_order(
    order_in: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Mock checkout flow that safely creates a verified customer order.
    Validates products, sets order_number ORD-YYYY-XXXX, computes total.
    """
    if not order_in.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Order must contain at least one item.")

    year = datetime.utcnow().year
    rand_seq = random.randint(10000, 99999)
    order_number = f"ORD-{year}-{rand_seq}"

    total = 0.0
    items_to_add = []
    for item_data in order_in.items:
        prod = db.query(Product).filter(Product.id == item_data.product_id).first()
        if not prod:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product {item_data.product_id} not found.")
        unit_price = prod.price or 49.99
        item_total = unit_price * item_data.quantity
        total += item_total
        items_to_add.append((prod, item_data.quantity, unit_price))

    order = Order(
        order_number=order_number,
        customer_id=current_user.id,
        total_amount=round(total, 2),
        payment_status="paid",
        order_status="completed",
        shipping_address=order_in.shipping_address or "Standard Shipping Address",
        created_at=datetime.utcnow()
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    out_items = []
    for prod, qty, unit_price in items_to_add:
        order_item = OrderItem(
            order_id=order.id,
            product_id=prod.id,
            quantity=qty,
            unit_price=unit_price
        )
        db.add(order_item)
        db.flush()
        out_items.append({
            "id": order_item.id,
            "product_id": prod.id,
            "product_name": prod.name,
            "product_sku": prod.sku,
            "product_image": prod.image_url,
            "quantity": qty,
            "unit_price": unit_price
        })

    db.commit()

    return {
        "id": order.id,
        "order_number": order.order_number,
        "customer_id": order.customer_id,
        "customer_name": current_user.full_name,
        "total_amount": order.total_amount,
        "payment_status": order.payment_status,
        "order_status": order.order_status,
        "shipping_address": order.shipping_address,
        "created_at": order.created_at,
        "items": out_items
    }
