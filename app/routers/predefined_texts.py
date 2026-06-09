from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, schemas
from app.auth_utils import get_current_active_user
from app.db import get_db

router = APIRouter(prefix="/predefined-texts", tags=["predefined-texts"])


@router.get("", response_model=list[schemas.PredefinedText])
def list_predefined_texts(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(models.PredefinedText)
        .filter(models.PredefinedText.user_id == current_user.id)
        .order_by(models.PredefinedText.created_at.asc())
        .all()
    )


@router.post("", response_model=schemas.PredefinedText, status_code=201)
def create_predefined_text(
    data: schemas.PredefinedTextCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    pt = models.PredefinedText(
        user_id=current_user.id,
        title=data.title,
        content=data.content,
        active=data.active,
    )
    db.add(pt)
    db.commit()
    db.refresh(pt)
    return pt


@router.put("/{pt_id}", response_model=schemas.PredefinedText)
def update_predefined_text(
    pt_id: int,
    data: schemas.PredefinedTextUpdate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    pt = db.query(models.PredefinedText).filter(
        models.PredefinedText.id == pt_id,
        models.PredefinedText.user_id == current_user.id,
    ).first()
    if not pt:
        raise HTTPException(status_code=404, detail="Not found")
    if data.title is not None:
        pt.title = data.title
    if data.content is not None:
        pt.content = data.content
    if data.active is not None:
        pt.active = data.active
    db.commit()
    db.refresh(pt)
    return pt


@router.delete("/{pt_id}", status_code=204)
def delete_predefined_text(
    pt_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    pt = db.query(models.PredefinedText).filter(
        models.PredefinedText.id == pt_id,
        models.PredefinedText.user_id == current_user.id,
    ).first()
    if not pt:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(pt)
    db.commit()
