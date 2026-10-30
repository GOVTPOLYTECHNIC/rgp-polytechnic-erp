from datetime import date, datetime, timedelta
from decimal import Decimal
import os
import hashlib
import hmac
import re

from fastapi import FastAPI, Depends, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from sqlalchemy.orm import Session
from sqlalchemy import func, Column, Integer, String, Date, Numeric, Text, ForeignKey

from database import Base, engine, SessionLocal
import models


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    expense_date = Column(Date, nullable=False, default=date.today, index=True)
    category = Column(String(80), nullable=False)
    description = Column(Text, nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    payment_mode = Column(String(30), nullable=False, default="Cash")
    reference_no = Column(String(100), nullable=True)
    institute = Column(String(100), nullable=False, default="Rajiv Gandhi Polytechnic", index=True)


class StaffMember(Base):
    __tablename__ = "staff_members"

    id = Column(Integer, primary_key=True, index=True)
    staff_code = Column(String(30), unique=True, nullable=False, index=True)
    full_name = Column(String(150), nullable=False)
    designation = Column(String(100), nullable=False)
    mobile = Column(String(15), nullable=False)
    institute = Column(String(100), nullable=False, index=True)
    joining_date = Column(Date, nullable=False, default=date.today)
    monthly_salary = Column(Numeric(12, 2), nullable=False, default=0)
    is_active = Column(Integer, nullable=False, default=1)


class SalaryPayroll(Base):
    __tablename__ = "salary_payroll"

    id = Column(Integer, primary_key=True, index=True)
    staff_id = Column(Integer, ForeignKey("staff_members.id"), nullable=False, index=True)
    payroll_month = Column(String(7), nullable=False, index=True)  # YYYY-MM
    basic_salary = Column(Numeric(12, 2), nullable=False)
    allowance = Column(Numeric(12, 2), nullable=False, default=0)
    deduction = Column(Numeric(12, 2), nullable=False, default=0)
    net_salary = Column(Numeric(12, 2), nullable=False)
    paid_amount = Column(Numeric(12, 2), nullable=False, default=0)
    payment_date = Column(Date, nullable=True)
    payment_mode = Column(String(30), nullable=False, default="Cash")
    payment_reference = Column(String(100), nullable=True)
    status = Column(String(20), nullable=False, default="Pending")
    created_at = Column(Date, nullable=False, default=date.today)


app = FastAPI(title="Rajiv Gandhi Polytechnic ERP API")
Base.metadata.create_all(bind=engine)

STUDENT_INSTITUTES = {
    "Rajiv Gandhi Polytechnic",
    "Rajiv Gandhi ITI",
    "Gramodyog Sewa Sansthan",
}

# Add institute column to existing students table without deleting records.
from sqlalchemy import text as sqlalchemy_text
with engine.begin() as connection:
    connection.execute(sqlalchemy_text(
        "ALTER TABLE students ADD COLUMN IF NOT EXISTS institute VARCHAR(100) NOT NULL DEFAULT 'Rajiv Gandhi Polytechnic'"
    ))
    connection.execute(sqlalchemy_text(
        "ALTER TABLE students ADD COLUMN IF NOT EXISTS photo_url TEXT NULL"
    ))

# Backward-compatible schema update for existing PostgreSQL databases.
# Adds institute to old expenses table without deleting existing records.
from sqlalchemy import text as sqlalchemy_text
with engine.begin() as connection:
    try:
        connection.execute(sqlalchemy_text(
            "ALTER TABLE expenses ADD COLUMN IF NOT EXISTS institute VARCHAR(100) NOT NULL DEFAULT 'Rajiv Gandhi Polytechnic'"
        ))
    except Exception:
        # Keep startup errors visible in normal database/API use; this is only a fallback
        # for database engines that do not support IF NOT EXISTS syntax.
        raise



app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://rgp-polytechnic-erp.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def protect_api(request: Request, call_next):
    # Let CORS preflight requests pass without requiring an admin token.
    # Browsers send OPTIONS before some authenticated API requests.
    if request.method == "OPTIONS":
        return await call_next(request)

    path = request.url.path
    public_paths = {
        "/api/health",
        "/api/courses",
        "/api/auth/login",
    }

    if path.startswith("/api/") and path not in public_paths:
        try:
            require_admin_request(request)
        except HTTPException as exc:
            from fastapi.responses import JSONResponse
            return JSONResponse(
                status_code=exc.status_code,
                content={"detail": exc.detail},
            )

    return await call_next(request)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --- Secure administrator login ---
SESSION_SECRET = os.getenv("ADMIN_SESSION_SECRET", "CHANGE_THIS_DEV_SECRET_BEFORE_DEPLOYMENT")
token_serializer = URLSafeTimedSerializer(SESSION_SECRET, salt="rgp-admin-session")
TOKEN_MAX_AGE_SECONDS = 8 * 60 * 60


def hash_password(password: str, salt: bytes | None = None) -> str:
    salt = salt or os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 310_000)
    return f"{salt.hex()}:{digest.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt_hex, digest_hex = stored_hash.split(":", 1)
        salt = bytes.fromhex(salt_hex)
        candidate = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 310_000).hex()
        return hmac.compare_digest(candidate, digest_hex)
    except (ValueError, TypeError):
        return False


def bootstrap_admin():
    username = os.getenv("ADMIN_USERNAME", "").strip()
    password = os.getenv("ADMIN_PASSWORD", "")
    if not username or not password:
        return
    db = SessionLocal()
    try:
        existing = db.query(models.AdminUser).filter(models.AdminUser.username == username).first()
        if not existing:
            db.add(models.AdminUser(username=username, password_hash=hash_password(password)))
            db.commit()
    finally:
        db.close()


bootstrap_admin()


class AdminLogin(BaseModel):
    username: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=1, max_length=256)


class AdminPasswordChange(BaseModel):
    current_password: str = Field(min_length=1, max_length=256)
    new_password: str = Field(min_length=12, max_length=256)


def require_admin_request(request: Request):
    authorization = request.headers.get("Authorization", "")
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Admin login required")
    token = authorization.removeprefix("Bearer ").strip()
    try:
        username = token_serializer.loads(token, max_age=TOKEN_MAX_AGE_SECONDS)
    except (BadSignature, SignatureExpired):
        raise HTTPException(status_code=401, detail="Session expired. Please log in again.")
    db = SessionLocal()
    try:
        admin = db.query(models.AdminUser).filter(models.AdminUser.username == username).first()
        if not admin:
            raise HTTPException(status_code=401, detail="Admin account not found")
    finally:
        db.close()
    return username


@app.post("/api/auth/login")
def admin_login(data: AdminLogin, db: Session = Depends(get_db)):
    admin = db.query(models.AdminUser).filter(models.AdminUser.username == data.username.strip()).first()
    if not admin or not verify_password(data.password, admin.password_hash):
        raise HTTPException(status_code=401, detail="यूज़रनेम या पासवर्ड गलत है।")
    token = token_serializer.dumps(admin.username)
    return {"access_token": token, "token_type": "bearer", "expires_in": TOKEN_MAX_AGE_SECONDS, "username": admin.username}


@app.get("/api/auth/me")
def admin_me(username: str = Depends(require_admin_request)):
    return {"username": username, "authenticated": True}


@app.post("/api/auth/change-password")
def change_admin_password(data: AdminPasswordChange, username: str = Depends(require_admin_request), db: Session = Depends(get_db)):
    admin = db.query(models.AdminUser).filter(models.AdminUser.username == username).first()
    if not admin or not verify_password(data.current_password, admin.password_hash):
        raise HTTPException(status_code=400, detail="वर्तमान पासवर्ड सही नहीं है।")
    if data.current_password == data.new_password:
        raise HTTPException(status_code=400, detail="नया पासवर्ड वर्तमान पासवर्ड से अलग रखें।")
    admin.password_hash = hash_password(data.new_password)
    db.commit()
    return {"message": "पासवर्ड सफलतापूर्वक बदल गया। कृपया दोबारा लॉगिन करें।"}


class StudentCreate(BaseModel):
    admission_no: str = Field(min_length=1, max_length=30)
    full_name: str = Field(min_length=1, max_length=150)
    father_name: str = Field(min_length=1, max_length=150)
    course: str = Field(min_length=1, max_length=100)
    mobile: str = Field(min_length=10, max_length=15)
    total_fee: Decimal = Field(default=Decimal("0"), ge=0)
    fee_paid: Decimal = Field(default=Decimal("0"), ge=0)
    institute: str = Field(default="Rajiv Gandhi Polytechnic", min_length=1, max_length=100)
    photo_url: str | None = Field(default=None, max_length=2_200_000)
    admission_date: date | None = None


class StudentUpdate(BaseModel):
    admission_no: str = Field(min_length=1, max_length=30)
    full_name: str = Field(min_length=1, max_length=150)
    father_name: str = Field(min_length=1, max_length=150)
    course: str = Field(min_length=1, max_length=100)
    mobile: str = Field(min_length=10, max_length=15)
    total_fee: Decimal = Field(ge=0)
    institute: str = Field(default="Rajiv Gandhi Polytechnic", min_length=1, max_length=100)
    photo_url: str | None = Field(default=None, max_length=2_200_000)


class ExpenseCreate(BaseModel):
    expense_date: date = Field(default_factory=date.today)
    category: str = Field(min_length=1, max_length=80)
    description: str = Field(min_length=1, max_length=1000)
    amount: Decimal = Field(gt=0)
    payment_mode: str = Field(default="Cash", max_length=30)
    reference_no: str | None = Field(default=None, max_length=100)
    institute: str = Field(default="Rajiv Gandhi Polytechnic", min_length=1, max_length=100)


class StaffCreate(BaseModel):
    staff_code: str = Field(min_length=1, max_length=30)
    full_name: str = Field(min_length=1, max_length=150)
    designation: str = Field(min_length=1, max_length=100)
    mobile: str = Field(min_length=10, max_length=15)
    institute: str = Field(min_length=1, max_length=100)
    joining_date: date = Field(default_factory=date.today)
    monthly_salary: Decimal = Field(ge=0)
    is_active: bool = True


class StaffUpdate(StaffCreate):
    pass


class PayrollCreate(BaseModel):
    staff_id: int = Field(gt=0)
    payroll_month: str = Field(pattern=r"^\\d{4}-(0[1-9]|1[0-2])$")
    basic_salary: Decimal = Field(ge=0)
    allowance: Decimal = Field(default=Decimal("0"), ge=0)
    deduction: Decimal = Field(default=Decimal("0"), ge=0)
    paid_amount: Decimal = Field(default=Decimal("0"), ge=0)
    payment_date: date | None = None
    payment_mode: str = Field(default="Cash", max_length=30)
    payment_reference: str | None = Field(default=None, max_length=100)


class FeePaymentCreate(BaseModel):
    student_id: int = Field(gt=0)
    paid_amount: Decimal = Field(gt=0)
    payment_mode: str = Field(default="Cash", max_length=30)


def student_balance(student):
    return student.total_fee - student.fee_paid


def payment_to_dict(payment, student, db):
    paid_until_receipt = (
        db.query(func.coalesce(func.sum(models.FeePayment.paid_amount), 0))
        .filter(
            models.FeePayment.student_id == payment.student_id,
            models.FeePayment.id <= payment.id,
        )
        .scalar()
    )
    balance_after_payment = student.total_fee - Decimal(str(paid_until_receipt))

    return {
        "receipt_no": payment.receipt_no,
        "student_id": student.id,
        "admission_no": student.admission_no,
        "student_name": student.full_name,
        "father_name": student.father_name,
        "course": student.course,
        "mobile": student.mobile,
        "institute": getattr(student, "institute", "Rajiv Gandhi Polytechnic"),
        "total_fee": student.total_fee,
        "paid_amount": payment.paid_amount,
        "payment_date": payment.payment_date.isoformat() if payment.payment_date else None,
        "payment_mode": payment.payment_mode,
        "balance_due": max(Decimal("0"), balance_after_payment),
    }


@app.get("/")
def home():
    return {
        "message": "Rajiv Gandhi Polytechnic ERP API is running",
        "status": "success",
    }


@app.get("/api/health")
def health():
    return {"status": "healthy"}


@app.get("/api/courses")
def courses():
    return {"courses": ["Civil Engineering", "Mechanical Engineering", "Electrical Engineering"]}


@app.post("/api/students", status_code=201)
def add_student(data: StudentCreate, db: Session = Depends(get_db)):
    if data.institute not in STUDENT_INSTITUTES:
        raise HTTPException(status_code=400, detail="Invalid institute selected")
    if data.fee_paid > data.total_fee:
        raise HTTPException(status_code=400, detail="Paid fee cannot exceed total fee")

    existing = db.query(models.Student).filter(
        models.Student.admission_no == data.admission_no
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Admission number already exists")

    student_data = data.model_dump(exclude={"admission_date"})
    student = models.Student(**student_data)
    if data.admission_date:
        student.admission_date = data.admission_date
    db.add(student)
    db.commit()
    db.refresh(student)
    return {
        "message": "Student added successfully",
        "student_id": student.id,
        "admission_no": student.admission_no,
        "full_name": student.full_name,
        "total_fee": student.total_fee,
        "fee_paid": student.fee_paid,
        "due_fee": student_balance(student),
    }


@app.get("/api/students")
def get_students(institute: str | None = None, db: Session = Depends(get_db)):
    query = db.query(models.Student)
    if institute:
        if institute not in STUDENT_INSTITUTES:
            raise HTTPException(status_code=400, detail="Invalid institute selected")
        query = query.filter(models.Student.institute == institute)
    students = query.order_by(models.Student.id.desc()).all()
    return [
        {
            "id": s.id,
            "admission_no": s.admission_no,
            "full_name": s.full_name,
            "father_name": s.father_name,
            "course": s.course,
            "mobile": s.mobile,
            "admission_date": s.admission_date.isoformat() if s.admission_date else None,
            "total_fee": s.total_fee,
            "fee_paid": s.fee_paid,
            "due_fee": student_balance(s),
            "institute": getattr(s, "institute", "Rajiv Gandhi Polytechnic"),
            "photo_url": getattr(s, "photo_url", None),
        }
        for s in students
    ]


@app.put("/api/students/{student_id}")
def update_student(student_id: int, data: StudentUpdate, db: Session = Depends(get_db)):
    if data.institute not in STUDENT_INSTITUTES:
        raise HTTPException(status_code=400, detail="Invalid institute selected")
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if data.total_fee < student.fee_paid:
        raise HTTPException(status_code=400, detail="Total fee cannot be less than fee already paid")

    duplicate = db.query(models.Student).filter(
        models.Student.admission_no == data.admission_no,
        models.Student.id != student_id,
    ).first()
    if duplicate:
        raise HTTPException(status_code=409, detail="Admission number already exists for another student")

    student.admission_no = data.admission_no
    student.full_name = data.full_name
    student.father_name = data.father_name
    student.course = data.course
    student.mobile = data.mobile
    student.total_fee = data.total_fee
    student.institute = data.institute
    student.photo_url = data.photo_url
    try:
        db.commit()
        db.refresh(student)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Student details could not be updated")

    return {
        "message": "Student updated successfully",
        "student_id": student.id,
        "admission_no": student.admission_no,
        "full_name": student.full_name,
        "father_name": student.father_name,
        "course": student.course,
        "mobile": student.mobile,
        "total_fee": student.total_fee,
        "fee_paid": student.fee_paid,
        "due_fee": student_balance(student),
        "institute": student.institute,
        "photo_url": student.photo_url,
    }


@app.post("/api/fees/collect", status_code=201)
def collect_fee(data: FeePaymentCreate, db: Session = Depends(get_db)):
    try:
        student = db.query(models.Student).filter(
            models.Student.id == data.student_id
        ).with_for_update().first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")

        due = student_balance(student)
        if data.paid_amount > due:
            raise HTTPException(status_code=400, detail="Payment exceeds the remaining fee balance")

        payment = models.FeePayment(
            student_id=student.id,
            receipt_no=f"TEMP-{date.today().strftime('%Y%m%d')}-{student.id}",
            paid_amount=data.paid_amount,
            payment_date=date.today(),
            payment_mode=data.payment_mode,
        )
        db.add(payment)
        db.flush()
        payment.receipt_no = f"RGP-FEE-{payment.id:06d}"
        student.fee_paid = student.fee_paid + data.paid_amount
        db.commit()
        db.refresh(payment)
        db.refresh(student)

        return {
            "message": "Fee payment recorded successfully",
            "receipt_no": payment.receipt_no,
            "payment_date": payment.payment_date.isoformat(),
            "student_id": student.id,
            "admission_no": student.admission_no,
            "student_name": student.full_name,
            "payment_mode": payment.payment_mode,
            "paid_amount": payment.paid_amount,
            "amount_paid_now": payment.paid_amount,
            "total_fee": student.total_fee,
            "total_paid": student.fee_paid,
            "due_fee": student_balance(student),
            "balance_due": student_balance(student),
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Payment could not be saved. Please check server logs.")


@app.get("/api/fees")
def get_all_payments(db: Session = Depends(get_db)):
    payments = db.query(models.FeePayment).order_by(models.FeePayment.id.desc()).all()
    return [
        {
            "receipt_no": p.receipt_no,
            "student_id": p.student_id,
            "paid_amount": p.paid_amount,
            "payment_date": p.payment_date.isoformat() if p.payment_date else None,
            "payment_mode": p.payment_mode,
        }
        for p in payments
    ]


@app.get("/api/fees/student/{student_id}")
def get_student_payments(student_id: int, db: Session = Depends(get_db)):
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    payments = db.query(models.FeePayment).filter(
        models.FeePayment.student_id == student_id
    ).order_by(models.FeePayment.id.desc()).all()

    return {
        "student_id": student.id,
        "student_name": student.full_name,
        "total_fee": student.total_fee,
        "total_paid": student.fee_paid,
        "due_fee": student_balance(student),
        "payments": [payment_to_dict(p, student, db) for p in payments],
    }


@app.get("/api/receipts")
def get_receipt_history(
    search: str = Query(default="", max_length=100),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    query = db.query(models.FeePayment, models.Student).join(
        models.Student, models.Student.id == models.FeePayment.student_id
    )
    if search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            (models.FeePayment.receipt_no.ilike(term))
            | (models.Student.admission_no.ilike(term))
            | (models.Student.full_name.ilike(term))
        )
    records = query.order_by(models.FeePayment.id.desc()).limit(limit).all()
    return [payment_to_dict(payment, student, db) for payment, student in records]


@app.get("/api/receipts/{receipt_no}")
def get_receipt(receipt_no: str, db: Session = Depends(get_db)):
    record = db.query(models.FeePayment, models.Student).join(
        models.Student, models.Student.id == models.FeePayment.student_id
    ).filter(models.FeePayment.receipt_no == receipt_no).first()
    if not record:
        raise HTTPException(status_code=404, detail="Receipt not found")
    payment, student = record
    return payment_to_dict(payment, student, db)


@app.delete("/api/students/{student_id}")
def delete_student(student_id: int, db: Session = Depends(get_db)):
    """Delete one student and that student's fee payments/receipts only."""
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    try:
        # FeePayment has a foreign key to Student, so remove dependent receipts first.
        deleted_payments = db.query(models.FeePayment).filter(
            models.FeePayment.student_id == student_id
        ).delete(synchronize_session=False)
        db.delete(student)
        db.commit()
        return {
            "message": "Student and related fee payment records deleted successfully",
            "student_id": student_id,
            "deleted_fee_payments": deleted_payments,
        }
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Student could not be deleted. No changes were committed.")


# Daily and monthly fee collection reports
@app.get("/api/reports/fees")
def fee_collection_report(
    period: str = Query(default="daily", pattern="^(daily|monthly)$"),
    report_date: date | None = Query(default=None),
    report_month: str | None = Query(default=None, min_length=7, max_length=7),
    institute: str | None = None,
    db: Session = Depends(get_db),
):
    if institute and institute not in STUDENT_INSTITUTES:
        raise HTTPException(status_code=400, detail="Invalid institute selected")
    if period == "daily":
        selected_date = report_date or date.today()
        start_date = selected_date
        next_date = selected_date + timedelta(days=1)
        end_date = selected_date
    else:
        if not report_month:
            today = date.today()
            report_month = f"{today.year:04d}-{today.month:02d}"
        try:
            year_text, month_text = report_month.split("-")
            year, month = int(year_text), int(month_text)
            start_date = date(year, month, 1)
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail="Month must be in YYYY-MM format")
        if len(report_month) != 7 or report_month[4] != "-":
            raise HTTPException(status_code=400, detail="Month must be in YYYY-MM format")
        next_date = date(start_date.year + (1 if start_date.month == 12 else 0), 1 if start_date.month == 12 else start_date.month + 1, 1)
        end_date = next_date - timedelta(days=1)

    query = db.query(models.FeePayment, models.Student).join(
        models.Student, models.Student.id == models.FeePayment.student_id
    ).filter(
        models.FeePayment.payment_date >= start_date,
        models.FeePayment.payment_date < next_date,
    ).order_by(models.FeePayment.id.asc())

    records = query.all()
    total_collection = sum((Decimal(str(payment.paid_amount)) for payment, _ in records), Decimal("0"))
    rows = [
        {
            "receipt_no": payment.receipt_no,
            "payment_date": payment.payment_date.isoformat() if payment.payment_date else None,
            "admission_no": student.admission_no,
            "student_name": student.full_name,
            "course": student.course,
            "paid_amount": payment.paid_amount,
            "payment_mode": payment.payment_mode,
        }
        for payment, student in records
    ]

    return {
        "period": period,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "total_collection": total_collection,
        "receipt_count": len(rows),
        "records": rows,
    }


# Expense management: create and list expenses
@app.post("/api/expenses", status_code=201)
def create_expense(data: ExpenseCreate, db: Session = Depends(get_db)):
    if data.institute not in ALLOWED_INSTITUTES:
        raise HTTPException(status_code=400, detail="Invalid institute selected")
    expense = Expense(
        expense_date=data.expense_date,
        category=data.category.strip(),
        description=data.description.strip(),
        amount=data.amount,
        payment_mode=data.payment_mode,
        reference_no=(data.reference_no.strip() or None) if data.reference_no else None,
        institute=data.institute,
    )
    db.add(expense)
    try:
        db.commit()
        db.refresh(expense)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Expense could not be saved")

    return expense_to_dict(expense)


def expense_to_dict(expense):
    return {
        "id": expense.id,
        "expense_date": expense.expense_date.isoformat() if expense.expense_date else None,
        "category": expense.category,
        "description": expense.description,
        "amount": expense.amount,
        "payment_mode": expense.payment_mode,
        "reference_no": expense.reference_no,
        "institute": getattr(expense, "institute", "Rajiv Gandhi Polytechnic"),
    }


@app.get("/api/expenses")
def list_expenses(
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    institute: str | None = None,
    limit: int = Query(default=500, ge=1, le=2000),
    db: Session = Depends(get_db),
):
    query = db.query(Expense)
    if institute:
        if institute not in ALLOWED_INSTITUTES:
            raise HTTPException(status_code=400, detail="Invalid institute selected")
        query = query.filter(Expense.institute == institute)
    if start_date:
        query = query.filter(Expense.expense_date >= start_date)
    if end_date:
        query = query.filter(Expense.expense_date <= end_date)
    records = query.order_by(Expense.expense_date.desc(), Expense.id.desc()).limit(limit).all()
    return [expense_to_dict(item) for item in records]


@app.put("/api/expenses/{expense_id}")
def update_expense(expense_id: int, data: ExpenseCreate, db: Session = Depends(get_db)):
    if data.institute not in ALLOWED_INSTITUTES:
        raise HTTPException(status_code=400, detail="Invalid institute selected")
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense record not found")
    expense.expense_date = data.expense_date
    expense.category = data.category.strip()
    expense.description = data.description.strip()
    expense.amount = data.amount
    expense.payment_mode = data.payment_mode
    expense.reference_no = (data.reference_no.strip() or None) if data.reference_no else None
    expense.institute = data.institute
    db.commit()
    db.refresh(expense)
    return expense_to_dict(expense)


@app.delete("/api/expenses/{expense_id}")
def delete_expense(expense_id: int, db: Session = Depends(get_db)):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense record not found")
    db.delete(expense)
    db.commit()
    return {"message": "Expense record deleted successfully"}


# Daily/monthly expense report, including fee income and net balance
@app.get("/api/reports/expenses")
def expense_report(
    period: str = Query(default="daily", pattern="^(daily|monthly)$"),
    report_date: date | None = Query(default=None),
    report_month: str | None = Query(default=None, min_length=7, max_length=7),
    institute: str | None = None,
    db: Session = Depends(get_db),
):
    if institute and institute not in ALLOWED_INSTITUTES:
        raise HTTPException(status_code=400, detail="Invalid institute selected")
    if period == "daily":
        selected_date = report_date or date.today()
        start_date = selected_date
        next_date = selected_date + timedelta(days=1)
        end_date = selected_date
    else:
        if not report_month:
            today = date.today()
            report_month = f"{today.year:04d}-{today.month:02d}"
        try:
            year, month = map(int, report_month.split("-"))
            start_date = date(year, month, 1)
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail="Month must be in YYYY-MM format")
        if len(report_month) != 7 or report_month[4] != "-":
            raise HTTPException(status_code=400, detail="Month must be in YYYY-MM format")
        next_date = date(start_date.year + (1 if start_date.month == 12 else 0), 1 if start_date.month == 12 else start_date.month + 1, 1)
        end_date = next_date - timedelta(days=1)

    expense_query = db.query(Expense).filter(
        Expense.expense_date >= start_date,
        Expense.expense_date < next_date,
    )
    if institute:
        expense_query = expense_query.filter(Expense.institute == institute)
    expenses = expense_query.order_by(Expense.expense_date.asc(), Expense.id.asc()).all()
    payments = db.query(models.FeePayment).filter(
        models.FeePayment.payment_date >= start_date,
        models.FeePayment.payment_date < next_date,
    ).all()
    total_expense = sum((Decimal(str(item.amount)) for item in expenses), Decimal("0"))
    total_income = sum((Decimal(str(item.paid_amount)) for item in payments), Decimal("0"))

    payroll_query = db.query(SalaryPayroll, StaffMember).join(
        StaffMember, StaffMember.id == SalaryPayroll.staff_id
    ).filter(
        SalaryPayroll.payment_date >= start_date,
        SalaryPayroll.payment_date < next_date,
    )
    if institute:
        payroll_query = payroll_query.filter(StaffMember.institute == institute)
    payroll_rows = payroll_query.all()
    payroll_paid = sum((Decimal(str(row.paid_amount or 0)) for row, _ in payroll_rows), Decimal("0"))
    all_expense = total_expense + payroll_paid

    return {
        "period": period,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "total_income": total_income,
        "institute": institute or "All Institutes",
        "total_expense": total_expense,
        "payroll_paid": payroll_paid,
        "combined_expense": all_expense,
        "net_balance": total_income - all_expense,
        "expense_count": len(expenses),
        "payroll_payment_count": len(payroll_rows),
        "records": [expense_to_dict(item) for item in expenses],
        "payroll_records": [
            {
                "payroll_month": row.payroll_month,
                "payment_date": row.payment_date.isoformat() if row.payment_date else None,
                "staff_code": staff.staff_code,
                "staff_name": staff.full_name,
                "institute": staff.institute,
                "paid_amount": float(row.paid_amount or 0),
                "payment_mode": row.payment_mode,
                "payment_reference": row.payment_reference,
            }
            for row, staff in payroll_rows
        ],
    }


# ---------------- Staff Management & Monthly Salary Payroll ----------------
ALLOWED_INSTITUTES = {
    "Rajiv Gandhi Polytechnic",
    "Rajiv Gandhi ITI",
    "Gramodyog Sewa Sansthan",
}


def staff_dict(staff):
    return {
        "id": staff.id,
        "staff_code": staff.staff_code,
        "full_name": staff.full_name,
        "designation": staff.designation,
        "mobile": staff.mobile,
        "institute": staff.institute,
        "joining_date": staff.joining_date.isoformat() if staff.joining_date else None,
        "monthly_salary": float(staff.monthly_salary or 0),
        "is_active": bool(staff.is_active),
    }


def payroll_dict(payroll, staff):
    return {
        "id": payroll.id,
        "staff_id": payroll.staff_id,
        "staff_code": staff.staff_code,
        "staff_name": staff.full_name,
        "designation": staff.designation,
        "institute": staff.institute,
        "payroll_month": payroll.payroll_month,
        "basic_salary": float(payroll.basic_salary or 0),
        "allowance": float(payroll.allowance or 0),
        "deduction": float(payroll.deduction or 0),
        "net_salary": float(payroll.net_salary or 0),
        "paid_amount": float(payroll.paid_amount or 0),
        "balance": max(0.0, float(payroll.net_salary or 0) - float(payroll.paid_amount or 0)),
        "payment_date": payroll.payment_date.isoformat() if payroll.payment_date else None,
        "payment_mode": payroll.payment_mode,
        "payment_reference": payroll.payment_reference,
        "status": payroll.status,
    }


@app.get("/api/staff")
def list_staff(institute: str | None = None, include_inactive: bool = False, db: Session = Depends(get_db)):
    query = db.query(StaffMember)
    if institute:
        if institute not in ALLOWED_INSTITUTES:
            raise HTTPException(status_code=400, detail="Invalid institute selected")
        query = query.filter(StaffMember.institute == institute)
    if not include_inactive:
        query = query.filter(StaffMember.is_active == 1)
    return [staff_dict(s) for s in query.order_by(StaffMember.full_name.asc()).all()]


@app.post("/api/staff", status_code=201)
def create_staff(data: StaffCreate, db: Session = Depends(get_db)):
    if data.institute not in ALLOWED_INSTITUTES:
        raise HTTPException(status_code=400, detail="Invalid institute selected")
    code = data.staff_code.strip()
    if db.query(StaffMember).filter(StaffMember.staff_code == code).first():
        raise HTTPException(status_code=409, detail="यह Staff Code पहले से मौजूद है।")
    staff = StaffMember(
        staff_code=code,
        full_name=data.full_name.strip(),
        designation=data.designation.strip(),
        mobile=data.mobile.strip(),
        institute=data.institute,
        joining_date=data.joining_date,
        monthly_salary=data.monthly_salary,
        is_active=1 if data.is_active else 0,
    )
    db.add(staff)
    db.commit()
    db.refresh(staff)
    return staff_dict(staff)


@app.put("/api/staff/{staff_id}")
def update_staff(staff_id: int, data: StaffUpdate, db: Session = Depends(get_db)):
    staff = db.query(StaffMember).filter(StaffMember.id == staff_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff record not found")
    if data.institute not in ALLOWED_INSTITUTES:
        raise HTTPException(status_code=400, detail="Invalid institute selected")
    duplicate = db.query(StaffMember).filter(
        StaffMember.staff_code == data.staff_code.strip(),
        StaffMember.id != staff_id,
    ).first()
    if duplicate:
        raise HTTPException(status_code=409, detail="यह Staff Code किसी अन्य कर्मचारी का है।")
    staff.staff_code = data.staff_code.strip()
    staff.full_name = data.full_name.strip()
    staff.designation = data.designation.strip()
    staff.mobile = data.mobile.strip()
    staff.institute = data.institute
    staff.joining_date = data.joining_date
    staff.monthly_salary = data.monthly_salary
    staff.is_active = 1 if data.is_active else 0
    db.commit()
    db.refresh(staff)
    return staff_dict(staff)


@app.get("/api/payroll")
def list_payroll(
    payroll_month: str | None = Query(default=None, min_length=7, max_length=7),
    institute: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(SalaryPayroll, StaffMember).join(StaffMember, StaffMember.id == SalaryPayroll.staff_id)
    if payroll_month:
        if not re.fullmatch(r"\\d{4}-(0[1-9]|1[0-2])", payroll_month):
            raise HTTPException(status_code=400, detail="Month must be YYYY-MM")
        query = query.filter(SalaryPayroll.payroll_month == payroll_month)
    if institute:
        if institute not in ALLOWED_INSTITUTES:
            raise HTTPException(status_code=400, detail="Invalid institute selected")
        query = query.filter(StaffMember.institute == institute)
    records = query.order_by(SalaryPayroll.payroll_month.desc(), StaffMember.full_name.asc()).all()
    return [payroll_dict(payroll, staff) for payroll, staff in records]


@app.post("/api/payroll", status_code=201)
def create_payroll(data: PayrollCreate, db: Session = Depends(get_db)):
    staff = db.query(StaffMember).filter(StaffMember.id == data.staff_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
    duplicate = db.query(SalaryPayroll).filter(
        SalaryPayroll.staff_id == data.staff_id,
        SalaryPayroll.payroll_month == data.payroll_month,
    ).first()
    if duplicate:
        raise HTTPException(status_code=409, detail="इस कर्मचारी की इस महीने की Salary पहले से बनी हुई है।")
    net = data.basic_salary + data.allowance - data.deduction
    if net < 0:
        raise HTTPException(status_code=400, detail="Deduction, Basic Salary और Allowance के कुल से अधिक नहीं हो सकती।")
    if data.paid_amount > net:
        raise HTTPException(status_code=400, detail="Paid Amount, Net Salary से अधिक नहीं हो सकता।")
    payroll = SalaryPayroll(
        staff_id=data.staff_id,
        payroll_month=data.payroll_month,
        basic_salary=data.basic_salary,
        allowance=data.allowance,
        deduction=data.deduction,
        net_salary=net,
        paid_amount=data.paid_amount,
        payment_date=data.payment_date,
        payment_mode=data.payment_mode,
        payment_reference=data.payment_reference,
        status="Paid" if data.paid_amount == net else ("Partial" if data.paid_amount > 0 else "Pending"),
    )
    db.add(payroll)
    db.commit()
    db.refresh(payroll)
    return payroll_dict(payroll, staff)


@app.put("/api/payroll/{payroll_id}/payment")
def update_payroll_payment(
    payroll_id: int,
    paid_amount: Decimal = Query(ge=0),
    payment_date: date | None = None,
    payment_mode: str = Query(default="Cash", max_length=30),
    payment_reference: str | None = Query(default=None, max_length=100),
    db: Session = Depends(get_db),
):
    record = db.query(SalaryPayroll).filter(SalaryPayroll.id == payroll_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Payroll record not found")
    if paid_amount > record.net_salary:
        raise HTTPException(status_code=400, detail="Paid Amount, Net Salary से अधिक नहीं हो सकता।")
    record.paid_amount = paid_amount
    record.payment_date = payment_date
    record.payment_mode = payment_mode
    record.payment_reference = payment_reference
    record.status = "Paid" if paid_amount == record.net_salary else ("Partial" if paid_amount > 0 else "Pending")
    db.commit()
    db.refresh(record)
    staff = db.query(StaffMember).filter(StaffMember.id == record.staff_id).first()
    return payroll_dict(record, staff)
