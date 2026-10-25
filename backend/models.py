from datetime import date

from sqlalchemy import Column, Integer, String, Date, Numeric, ForeignKey, Text
from database import Base


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    admission_no = Column(String(30), unique=True, nullable=False)
    full_name = Column(String(150), nullable=False)
    father_name = Column(String(150), nullable=False)
    course = Column(String(100), nullable=False)
    mobile = Column(String(15), nullable=False)
    admission_date = Column(Date, default=date.today)
    total_fee = Column(Numeric(10, 2), default=0)
    fee_paid = Column(Numeric(10, 2), default=0)
    institute = Column(String(100), nullable=False, default="Rajiv Gandhi Polytechnic", index=True)
    photo_url = Column(Text, nullable=True)


class FeePayment(Base):
    __tablename__ = "fee_payments"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    receipt_no = Column(String(30), unique=True, nullable=False)
    paid_amount = Column(Numeric(10, 2), nullable=False)
    payment_date = Column(Date, default=date.today, nullable=False)
    payment_mode = Column(String(30), default="Cash", nullable=False)


class AdminUser(Base):
    __tablename__ = "admin_users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(80), unique=True, nullable=False, index=True)
    password_hash = Column(String(256), nullable=False)
