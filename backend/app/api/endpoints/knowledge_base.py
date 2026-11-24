import re
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.api.deps import get_db, get_current_user, require_agent
from app.models.entities import KnowledgeBaseArticle, User
from app.schemas.schemas import KBArticleOut, KBArticleCreate

router = APIRouter()

def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    return re.sub(r'[\s_-]+', '-', text)

@router.get("", response_model=List[KBArticleOut])
async def list_articles(
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(KnowledgeBaseArticle).filter(KnowledgeBaseArticle.is_published == True)
    if category and category != "ALL":
        query = query.filter(KnowledgeBaseArticle.category == category)
    if search:
        search_fmt = f"%{search.lower()}%"
        query = query.filter(
            or_(
                KnowledgeBaseArticle.title.ilike(search_fmt),
                KnowledgeBaseArticle.content.ilike(search_fmt),
                KnowledgeBaseArticle.tags.ilike(search_fmt)
            )
        )
    return query.all()

@router.get("/{slug}", response_model=KBArticleOut)
async def get_article_by_slug(slug: str, db: Session = Depends(get_db)):
    article = db.query(KnowledgeBaseArticle).filter(KnowledgeBaseArticle.slug == slug).first()
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found.")
    article.views_count += 1
    db.commit()
    db.refresh(article)
    return article

@router.post("", response_model=KBArticleOut, status_code=status.HTTP_201_CREATED)
async def create_article(
    article_in: KBArticleCreate,
    current_user: User = Depends(require_agent),
    db: Session = Depends(get_db)
):
    base_slug = slugify(article_in.title)
    slug = base_slug
    idx = 1
    while db.query(KnowledgeBaseArticle).filter(KnowledgeBaseArticle.slug == slug).first():
        slug = f"{base_slug}-{idx}"
        idx += 1

    article = KnowledgeBaseArticle(
        title=article_in.title,
        slug=slug,
        category=article_in.category,
        content=article_in.content,
        tags=article_in.tags,
        is_published=article_in.is_published
    )
    db.add(article)
    db.commit()
    db.refresh(article)
    return article

@router.post("/{article_id}/helpful")
async def mark_helpful(article_id: str, db: Session = Depends(get_db)):
    article = db.query(KnowledgeBaseArticle).filter(KnowledgeBaseArticle.id == article_id).first()
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found.")
    article.helpful_count += 1
    db.commit()
    return {"message": "Thank you for your feedback!", "helpful_count": article.helpful_count}
