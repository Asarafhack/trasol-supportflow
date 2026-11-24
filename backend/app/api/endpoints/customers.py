from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, require_customer
from app.models.entities import User, UserProfile, Order, Product, OrderItem
from app.schemas.schemas import UserOut, UserProfileUpdate, OrderOut, ProductOut

router = APIRouter()

@router.get("/me", response_model=UserOut)
async def get_customer_profile(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/me", response_model=UserOut)
async def update_customer_profile(
    profile_in: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if profile_in.full_name is not None:
        current_user.full_name = profile_in.full_name
    if profile_in.phone is not None:
        current_user.phone = profile_in.phone
    if profile_in.avatar_url is not None:
        current_user.avatar_url = profile_in.avatar_url

    if not current_user.profile:
        current_user.profile = UserProfile(user_id=current_user.id)
        db.add(current_user.profile)

    if profile_in.company_name is not None:
        current_user.profile.company_name = profile_in.company_name
    if profile_in.job_title is not None:
        current_user.profile.job_title = profile_in.job_title
    if profile_in.department is not None:
        current_user.profile.department = profile_in.department
    if profile_in.timezone is not None:
        current_user.profile.timezone = profile_in.timezone

    db.commit()
    db.refresh(current_user)
    return current_user

@router.get("/me/orders", response_model=List[OrderOut])
async def get_my_orders(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    orders = db.query(Order).filter(Order.customer_id == current_user.id).order_by(Order.created_at.desc()).all()
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
            "customer_name": current_user.full_name,
            "total_amount": o.total_amount,
            "payment_status": o.payment_status,
            "order_status": o.order_status,
            "shipping_address": o.shipping_address,
            "created_at": o.created_at,
            "items": items
        })
    return results

@router.get("/me/products", response_model=List[ProductOut])
async def get_my_purchased_products(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Find all products in completed/paid orders belonging to this customer
    products = (
        db.query(Product)
        .join(OrderItem, OrderItem.product_id == Product.id)
        .join(Order, Order.id == OrderItem.order_id)
        .filter(Order.customer_id == current_user.id)
        .distinct()
        .all()
    )
    return products
