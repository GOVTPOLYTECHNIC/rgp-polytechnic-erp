
"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import * as XLSX from "xlsx";

const API = "http://127.0.0.1:8000";

async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("rgp_admin_token") : null;
  const headers = new Headers(init.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(input, { ...init, headers });
  if (response.status === 401 && typeof window !== "undefined" && !window.location.pathname.endsWith("/admin/login")) {
    localStorage.removeItem("rgp_admin_token");
    localStorage.removeItem("rgp_admin_username");
    window.location.replace("/admin/login");
  }
  return response;
}

type Student = {
  id: number;
  admission_no: string;
  full_name: string;
  father_name?: string;
  course: string;
  mobile?: string;
  total_fee: number | string;
  fee_paid: number | string;
  due_fee?: number | string;
  institute?: string;
  photo_url?: string | null;
};

type StaffMemberRecord = {
  id: number;
  staff_code: string;
  full_name: string;
  designation: string;
  mobile: string;
  institute: string;
  joining_date: string;
  monthly_salary: number | string;
  is_active: boolean;
};

type PayrollRecord = {
  id: number;
  staff_id: number;
  staff_code: string;
  staff_name: string;
  designation: string;
  institute: string;
  payroll_month: string;
  basic_salary: number | string;
  allowance: number | string;
  deduction: number | string;
  net_salary: number | string;
  paid_amount: number | string;
  balance: number | string;
  payment_date?: string | null;
  payment_mode: string;
  payment_reference?: string | null;
  status: string;
};

type Receipt = {
  receipt_no: string;
  student_id: number;
  admission_no?: string;
  student_name?: string;
  father_name?: string;
  course?: string;
  mobile?: string;
  institute?: string;
  total_fee: number | string;
  paid_amount: number | string;
  payment_mode: string;
  payment_date?: string;
  balance_due?: number | string;
};

type StudentFeeHistory = {
  student_id: number;
  student_name: string;
  total_fee: number | string;
  total_paid: number | string;
  due_fee: number | string;
  payments: Receipt[];
};

type FeeReportRecord = {
  receipt_no: string;
  payment_date?: string;
  admission_no?: string;
  student_name?: string;
  course?: string;
  paid_amount: number | string;
  payment_mode: string;
};

type FeeReport = {
  period: string;
  start_date: string;
  end_date: string;
  total_collection: number | string;
  receipt_count: number;
  records: FeeReportRecord[];
};

type ExpenseRecord = {
  id: number;
  expense_date: string;
  category: string;
  description: string;
  amount: number | string;
  payment_mode: string;
  reference_no?: string | null;
  institute?: string;
};

type ExpenseReport = {
  period: string;
  start_date: string;
  end_date: string;
  total_income: number | string;
  total_expense: number | string;
  payroll_paid?: number | string;
  combined_expense?: number | string;
  net_balance: number | string;
  expense_count: number;
  institute?: string;
  records: ExpenseRecord[];
  payroll_records?: Array<{payroll_month:string; payment_date?:string|null; staff_code:string; staff_name:string; institute:string; paid_amount:number|string; payment_mode:string; payment_reference?:string|null}>;
};

type Notice = {
  title: string;
  detail: string;
  date: string;
};

const initialNotices: Notice[] = [
  {
    title: "Admission Enquiry",
    detail: "Contact the institution for current admission information.",
    date: "Important",
  },
  {
    title: "Course Information",
    detail: "Civil, Mechanical and Electrical Engineering.",
    date: "Courses",
  },
];

const money = (value: number | string | undefined) =>
  "₹" +
  Number(value ?? 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-IN");
}

export default function AdminPage() {
  const [active, setActive] = useState("Dashboard");

  useEffect(() => {
    const token = localStorage.getItem("rgp_admin_token");
    if (!token) {
      window.location.replace("/admin/login");
      return;
    }
    let cancelled = false;
    apiFetch(`${API}/api/auth/me`).then((response) => {
      if (!response.ok && !cancelled) {
        localStorage.removeItem("rgp_admin_token");
        window.location.replace("/admin/login");
      }
    }).catch(() => {
      if (!cancelled) window.location.replace("/admin/login");
    });
    return () => { cancelled = true; };
  }, []);

  const [notices, setNotices] = useState(initialNotices);
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeDetail, setNoticeDetail] = useState("");
  const [message, setMessage] = useState("");

  const [students, setStudents] = useState<Student[]>([]);
  const [dashboardStats, setDashboardStats] = useState({
    studentCount: 0,
    feesCollected: 0,
    feesDue: 0,
    monthlyExpenses: 0,
  });
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardMessage, setDashboardMessage] = useState("");
  const [dashboardRefresh, setDashboardRefresh] = useState(0);
  const [selectedId, setSelectedId] = useState("");
  const [feeInstituteFilter, setFeeInstituteFilter] = useState("Rajiv Gandhi Polytechnic");
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [feeMessage, setFeeMessage] = useState("");

  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [receiptStudent, setReceiptStudent] = useState<Student | null>(null);
  const [idCardStudentId, setIdCardStudentId] = useState("");
  const [idCardInstitute, setIdCardInstitute] = useState("Rajiv Gandhi Polytechnic");
  const [idCardQr, setIdCardQr] = useState("");

  const [history, setHistory] = useState<Receipt[]>([]);
  const [historySearch, setHistorySearch] = useState("");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyMessage, setHistoryMessage] = useState("");

  const [studentSearch, setStudentSearch] = useState("");
  const [studentInstituteFilter, setStudentInstituteFilter] = useState("All");
  const [feeHistory, setFeeHistory] = useState<StudentFeeHistory | null>(null);
  const [feeHistoryLoading, setFeeHistoryLoading] = useState(false);
  const [feeHistoryMessage, setFeeHistoryMessage] = useState("");
  const [studentFormMessage, setStudentFormMessage] = useState("");
  const [studentImportMessage, setStudentImportMessage] = useState("");
  const [studentImporting, setStudentImporting] = useState(false);
  const [studentSaving, setStudentSaving] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<number | null>(null);
  const [studentForm, setStudentForm] = useState({
    admission_no: "",
    full_name: "",
    father_name: "",
    course: "Civil Engineering",
    mobile: "",
    total_fee: "",
    institute: "Rajiv Gandhi Polytechnic",
    photo_url: "",
  });

  const [staffList, setStaffList] = useState<StaffMemberRecord[]>([]);
  const [payrollList, setPayrollList] = useState<PayrollRecord[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [payrollLoading, setPayrollLoading] = useState(false);
  const [staffMessage, setStaffMessage] = useState("");
  const [payrollMessage, setPayrollMessage] = useState("");
  const [staffSearch, setStaffSearch] = useState("");
  const [staffInstituteFilter, setStaffInstituteFilter] = useState("All");
  const [payrollInstituteFilter, setPayrollInstituteFilter] = useState("All");
  const [payrollMonth, setPayrollMonth] = useState("");
  const [editingStaffId, setEditingStaffId] = useState<number | null>(null);
  const [staffSaving, setStaffSaving] = useState(false);
  const [payrollSaving, setPayrollSaving] = useState(false);
  const [staffForm, setStaffForm] = useState({
    staff_code: "",
    full_name: "",
    designation: "",
    mobile: "",
    institute: "Rajiv Gandhi Polytechnic",
    joining_date: "",
    monthly_salary: "",
  });
  const [payrollForm, setPayrollForm] = useState({
    staff_id: "",
    payroll_month: "",
    basic_salary: "",
    allowance: "0",
    deduction: "0",
    paid_amount: "0",
    payment_date: "",
    payment_mode: "Cash",
    payment_reference: "",
  });


  const [reportPeriod, setReportPeriod] = useState("daily");
  // Date state starts empty so the first client render is deterministic.
  // The current local date/month is filled in after mounting in useEffect.
  const [reportDate, setReportDate] = useState("");
  const [reportMonth, setReportMonth] = useState("");
  const [feeReport, setFeeReport] = useState<FeeReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportMessage, setReportMessage] = useState("");

  const [expenseDate, setExpenseDate] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("Electricity Bill");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expensePaymentMode, setExpensePaymentMode] = useState("Cash");
  const [expenseReference, setExpenseReference] = useState("");
  const [expenseInstitute, setExpenseInstitute] = useState("Rajiv Gandhi Polytechnic");
  const [expenseReportInstitute, setExpenseReportInstitute] = useState("All");
  const [expenseMessage, setExpenseMessage] = useState("");
  const [expenseSaving, setExpenseSaving] = useState(false);
  const [expensePeriod, setExpensePeriod] = useState("daily");
  const [expenseReportDate, setExpenseReportDate] = useState("");
  const [expenseReportMonth, setExpenseReportMonth] = useState("");
  const [expenseReport, setExpenseReport] = useState<ExpenseReport | null>(null);
  const [expenseReportLoading, setExpenseReportLoading] = useState(false);

  // Build a local QR image for the selected student; it contains only admission number and institute.
  useEffect(() => {
    const student = students.find((item) => String(item.id) === idCardStudentId);
    if (!student) { setIdCardQr(""); return; }
    let cancelled = false;
    QRCode.toDataURL(JSON.stringify({ admission_no: student.admission_no, institute: student.institute || "Rajiv Gandhi Polytechnic" }), { width: 220, margin: 1 })
      .then((url) => { if (!cancelled) setIdCardQr(url); })
      .catch(() => { if (!cancelled) setIdCardQr(""); });
    return () => { cancelled = true; };
  }, [students, idCardStudentId]);

  // Set date fields after mount to avoid Next.js unstable Date() during prerender.
  useEffect(() => {
    const now = new Date();
    const localDate = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");
    const localMonth = localDate.slice(0, 7);

    setReportDate((current) => current || localDate);
    setReportMonth((current) => current || localMonth);
    setExpenseDate((current) => current || localDate);
    setExpenseReportDate((current) => current || localDate);
    setExpenseReportMonth((current) => current || localMonth);
  }, []);

  // Load live dashboard figures from the existing API endpoints.
  useEffect(() => {
    if (active !== "Dashboard") return;

    let cancelled = false;
    async function loadDashboardStats() {
      setDashboardLoading(true);
      setDashboardMessage("");
      try {
        const now = new Date();
        const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const [studentsResponse, expensesResponse] = await Promise.all([
          apiFetch(`${API}/api/students`),
          apiFetch(`${API}/api/reports/expenses?${new URLSearchParams({ period: "monthly", report_month: month }).toString()}`),
        ]);

        const studentsData = await studentsResponse.json();
        if (!studentsResponse.ok) {
          throw new Error(studentsData.detail || "विद्यार्थियों का डेटा लोड नहीं हुआ।");
        }
        const studentList: Student[] = Array.isArray(studentsData) ? studentsData : [];

        let monthlyExpenses = 0;
        if (expensesResponse.ok) {
          const expensesData = await expensesResponse.json();
          monthlyExpenses = Number(expensesData.total_expense ?? 0);
        }

        const feesCollected = studentList.reduce((sum, student) => sum + Number(student.fee_paid ?? 0), 0);
        const feesDue = studentList.reduce(
          (sum, student) => sum + Math.max(0, Number(student.due_fee ?? (Number(student.total_fee ?? 0) - Number(student.fee_paid ?? 0)))),
          0
        );

        if (!cancelled) {
          setDashboardStats({ studentCount: studentList.length, feesCollected, feesDue, monthlyExpenses });
        }
      } catch (error) {
        if (!cancelled) {
          setDashboardMessage(error instanceof Error ? error.message : "Dashboard डेटा लोड नहीं हुआ।");
        }
      } finally {
        if (!cancelled) setDashboardLoading(false);
      }
    }

    loadDashboardStats();
    return () => { cancelled = true; };
  }, [active, dashboardRefresh]);

  const menu = [
    "Dashboard",
    "Notices",
    "Courses",
    "Admissions",
    "Student Management",
    "Student ID Cards",
    "Staff & Payroll",
    "Fees & Receipts",
    "Receipt History",
    "Fees Reports",
    "Expense Management",
    "Website",
  ];

  const feeFilteredStudents = students.filter(
    (student) => (student.institute || "Rajiv Gandhi Polytechnic") === feeInstituteFilter
  );

  const selectedStudent =
    students.find((s) => String(s.id) === selectedId) ?? null;

  const totalFee = Number(selectedStudent?.total_fee ?? 0);
  const feePaid = Number(selectedStudent?.fee_paid ?? 0);
  const dueFee = selectedStudent
    ? Math.max(
        0,
        Number(selectedStudent.due_fee ?? totalFee - feePaid)
      )
    : 0;

  // Load students when opening the fee collection page
  useEffect(() => {
    if (active !== "Fees & Receipts") return;

    let cancelled = false;

    async function loadStudents() {
      setLoadingStudents(true);
      setFeeMessage("");

      try {
        const response = await apiFetch(`${API}/api/students`);
        if (!response.ok) {
          throw new Error("विद्यार्थियों की सूची लोड नहीं हुई।");
        }

        const data = await response.json();
        const list: Student[] = Array.isArray(data)
          ? data
          : Array.isArray(data.students)
            ? data.students
            : [];

        if (!cancelled) {
          setStudents(list);
          setSelectedId((current) =>
            list.some((s) => String(s.id) === current) ? current : ""
          );
        }
      } catch {
        if (!cancelled) {
          setFeeMessage(
            "Backend से कनेक्शन नहीं हुआ। FastAPI सर्वर चालू है या नहीं, जाँचें।"
          );
        }
      } finally {
        if (!cancelled) setLoadingStudents(false);
      }
    }

    loadStudents();

    return () => {
      cancelled = true;
    };
  }, [active]);

  // Load saved receipts from the database
  async function loadHistory(search = historySearch) {
    setHistoryLoading(true);
    setHistoryMessage("");

    try {
      const url = `${API}/api/receipts?search=${encodeURIComponent(
        search.trim()
      )}&limit=500`;

      const response = await apiFetch(url);

      if (!response.ok) {
        throw new Error("Receipt History लोड नहीं हो सकी।");
      }

      const data = await response.json();
      setHistory(Array.isArray(data) ? data : []);
      if (!Array.isArray(data) || data.length === 0) {
        setHistoryMessage("कोई रसीद नहीं मिली।");
      }
    } catch (error) {
      setHistory([]);
      setHistoryMessage(
        error instanceof Error
          ? error.message
          : "Receipt History लोड करने में समस्या हुई।"
      );
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    if (active === "Student Management" || active === "Student ID Cards") {
      loadStudentRecords();
    }
    // Load records whenever this menu is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => {
    if (active === "Receipt History") {
      loadHistory("");
    }
    // Load when the menu is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  function exportStudentsExcel() {
    const rows = students.map((s) => ({
      Admission_No: s.admission_no, Student_Name: s.full_name, Father_Name: s.father_name || "",
      Mobile: s.mobile || "", Institute: s.institute || "Rajiv Gandhi Polytechnic", Course: s.course,
      Total_Fee: Number(s.total_fee || 0), Fee_Paid: Number(s.fee_paid || 0), Due_Fee: Number(s.due_fee ?? (Number(s.total_fee || 0) - Number(s.fee_paid || 0))),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{wch:18},{wch:28},{wch:28},{wch:16},{wch:30},{wch:30},{wch:14},{wch:14},{wch:14}];
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, `RGP_Students_${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  function downloadStudentTemplate() {
    const ws = XLSX.utils.json_to_sheet([{
      Admission_No: "RGP2024-001", Student_Name: "Student Full Name", Father_Name: "Father Name",
      Mobile: "9876543210", Institute: "Rajiv Gandhi Polytechnic", Course: "Civil Engineering",
      Admission_Date: "2024-07-01", Total_Fee: 20000, Fee_Paid: 0,
    }]);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Import Template");
    XLSX.writeFile(wb, "RGP_Student_Import_Template.xlsx");
  }

  async function importStudentsExcel(file: File) {
    setStudentImportMessage(""); setStudentImporting(true);
    let added = 0; let skipped = 0; const errors: string[] = [];
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!sheet) throw new Error("Excel में कोई sheet नहीं मिली।");
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      if (!rows.length) throw new Error("Excel में कोई विद्यार्थी रिकॉर्ड नहीं है।");
      const norm = (row: Record<string, unknown>, ...keys: string[]) => {
        const wanted = keys.map(k => k.toLowerCase().replace(/[^a-z0-9]/g, ""));
        const found = Object.keys(row).find(k => wanted.includes(k.toLowerCase().replace(/[^a-z0-9]/g, "")));
        return found ? row[found] : "";
      };
      const knownAdmissions = new Set(students.map(s => s.admission_no.trim().toLowerCase()));
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const admission = String(norm(r, "Admission_No", "Admission Number", "admission_no")).trim();
        const name = String(norm(r, "Student_Name", "Full Name", "full_name")).trim();
        const father = String(norm(r, "Father_Name", "Father's Name", "father_name")).trim();
        const mobile = String(norm(r, "Mobile", "Mobile Number", "mobile")).trim().replace(/\.0$/, "");
        const institute = String(norm(r, "Institute", "Institution")).trim() || "Rajiv Gandhi Polytechnic";
        const course = String(norm(r, "Course", "Trade")).trim();
        const total = Number(norm(r, "Total_Fee", "Total Fee") || 0);
        const paid = Number(norm(r, "Fee_Paid", "Paid", "fee_paid") || 0);
        const rawDate = norm(r, "Admission_Date", "Admission Date", "admission_date");
        let admissionDate = "";
        if (rawDate instanceof Date && !Number.isNaN(rawDate.getTime())) admissionDate = rawDate.toISOString().slice(0,10);
        else if (typeof rawDate === "number" && rawDate > 20000) admissionDate = XLSX.SSF.format("yyyy-mm-dd", rawDate);
        else if (String(rawDate).trim()) { const v = String(rawDate).trim(); const m = v.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/); const d = v.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/); if (m) admissionDate = `${m[1]}-${m[2].padStart(2,"0")}-${m[3].padStart(2,"0")}`; else if (d) admissionDate = `${d[3]}-${d[2].padStart(2,"0")}-${d[1].padStart(2,"0")}`; }
        if (!admission || !name || !father || !mobile || !course) { skipped++; if (errors.length < 8) errors.push(`Row ${i+2}: Admission No, Name, Father, Mobile और Course जरूरी हैं।`); continue; }
        if (knownAdmissions.has(admission.toLowerCase())) { skipped++; if (errors.length < 8) errors.push(`Row ${i+2}: Admission No ${admission} पहले से मौजूद है।`); continue; }
        if (!["Rajiv Gandhi Polytechnic", "Rajiv Gandhi ITI", "Gramodyog Sewa Sansthan"].includes(institute)) { skipped++; if (errors.length < 8) errors.push(`Row ${i+2}: Institute नाम सही नहीं है।`); continue; }
        if (!Number.isFinite(total) || !Number.isFinite(paid) || total < 0 || paid < 0 || paid > total) { skipped++; if (errors.length < 8) errors.push(`Row ${i+2}: Fee राशि गलत है।`); continue; }
        try {
          const response = await apiFetch(`${API}/api/students`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ admission_no: admission, full_name: name, father_name: father, mobile, institute, course, total_fee: total, fee_paid: paid, ...(admissionDate ? { admission_date: admissionDate } : {}) }) });
          const data = await response.json();
          if (!response.ok) throw new Error(data.detail || "Save नहीं हुआ");
          knownAdmissions.add(admission.toLowerCase()); added++;
        } catch (e) { skipped++; if (errors.length < 8) errors.push(`Row ${i+2} (${admission}): ${e instanceof Error ? e.message : "Save नहीं हुआ"}`); }
      }
      await loadStudentRecords();
      setStudentImportMessage(`Import पूरा हुआ: ${added} जोड़े गए, ${skipped} छोड़े गए.${errors.length ? " विवरण: " + errors.join(" | ") : ""}${rows.length > 8 && errors.length === 8 ? " | बाकी त्रुटियाँ नहीं दिखाई गईं।" : ""}`);
    } catch (e) { setStudentImportMessage(e instanceof Error ? e.message : "Excel पढ़ने में समस्या हुई।"); }
    finally { setStudentImporting(false); }
  }

  async function loadStudentRecords() {
    setLoadingStudents(true);
    setStudentFormMessage("");

    try {
      const response = await apiFetch(`${API}/api/students`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "विद्यार्थियों की सूची लोड नहीं हुई।");
      }

      setStudents(Array.isArray(data) ? data : []);
    } catch (error) {
      setStudentFormMessage(
        error instanceof Error
          ? error.message
          : "Backend से कनेक्शन नहीं हुआ।"
      );
    } finally {
      setLoadingStudents(false);
    }
  }

  async function openStudentFeeHistory(student: Student) {
    setFeeHistory(null);
    setFeeHistoryMessage("");
    setFeeHistoryLoading(true);

    try {
      const response = await apiFetch(`${API}/api/fees/student/${student.id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "विद्यार्थी की Fee History लोड नहीं हुई।");
      }

      setFeeHistory(data as StudentFeeHistory);
      setFeeHistoryMessage(
        Array.isArray(data.payments) && data.payments.length === 0
          ? "इस विद्यार्थी की अभी कोई फीस जमा नहीं हुई है।"
          : ""
      );
    } catch (error) {
      setFeeHistoryMessage(
        error instanceof Error ? error.message : "Fee History खोलने में समस्या हुई।"
      );
    } finally {
      setFeeHistoryLoading(false);
    }
  }

  function resetStudentForm() {
    setEditingStudentId(null);
    setStudentForm({
      admission_no: "",
      full_name: "",
      father_name: "",
      course: "Civil Engineering",
      mobile: "",
      total_fee: "",
      institute: "Rajiv Gandhi Polytechnic",
      photo_url: "",
    });
    setStudentFormMessage("");
  }

  function startEditingStudent(student: Student) {
    setEditingStudentId(student.id);
    setStudentForm({
      admission_no: student.admission_no,
      full_name: student.full_name,
      father_name: student.father_name ?? "",
      course: student.course,
      mobile: student.mobile ?? "",
      total_fee: String(student.total_fee ?? ""),
      institute: student.institute || "Rajiv Gandhi Polytechnic",
      photo_url: student.photo_url || "",
    });
    setStudentFormMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }


  const institutes = [
    "Rajiv Gandhi Polytechnic",
    "Rajiv Gandhi ITI",
    "Gramodyog Sewa Sansthan",
  ];

  async function loadStaffRecords() {
    setStaffLoading(true);
    setStaffMessage("");
    try {
      const query = staffInstituteFilter !== "All"
        ? `?institute=${encodeURIComponent(staffInstituteFilter)}&include_inactive=true`
        : "?include_inactive=true";
      const response = await apiFetch(`${API}/api/staff${query}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Staff रिकॉर्ड लोड नहीं हुए।");
      setStaffList(Array.isArray(data) ? data : []);
    } catch (error) {
      setStaffMessage(error instanceof Error ? error.message : "Staff रिकॉर्ड लोड नहीं हुए।");
    } finally {
      setStaffLoading(false);
    }
  }

  async function loadPayrollRecords() {
    setPayrollLoading(true);
    setPayrollMessage("");
    try {
      const params = new URLSearchParams();
      if (payrollMonth) params.set("payroll_month", payrollMonth);
      if (payrollInstituteFilter !== "All") params.set("institute", payrollInstituteFilter);
      const response = await apiFetch(`${API}/api/payroll?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Payroll रिकॉर्ड लोड नहीं हुए।");
      setPayrollList(Array.isArray(data) ? data : []);
    } catch (error) {
      setPayrollMessage(error instanceof Error ? error.message : "Payroll रिकॉर्ड लोड नहीं हुए।");
    } finally {
      setPayrollLoading(false);
    }
  }

  function resetStaffForm() {
    setEditingStaffId(null);
    setStaffForm({
      staff_code: "", full_name: "", designation: "", mobile: "",
      institute: "Rajiv Gandhi Polytechnic", joining_date: "", monthly_salary: "",
    });
  }

  function editStaffRecord(staff: StaffMemberRecord) {
    setEditingStaffId(staff.id);
    setStaffForm({
      staff_code: staff.staff_code,
      full_name: staff.full_name,
      designation: staff.designation,
      mobile: staff.mobile,
      institute: staff.institute,
      joining_date: staff.joining_date || "",
      monthly_salary: String(staff.monthly_salary ?? ""),
    });
    setStaffMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveStaff(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStaffSaving(true);
    setStaffMessage("");
    try {
      const payload = {
        ...staffForm,
        staff_code: staffForm.staff_code.trim(),
        full_name: staffForm.full_name.trim(),
        designation: staffForm.designation.trim(),
        mobile: staffForm.mobile.trim(),
        joining_date: staffForm.joining_date || new Date().toISOString().slice(0, 10),
        monthly_salary: Number(staffForm.monthly_salary),
        is_active: true,
      };
      const response = await apiFetch(
        editingStaffId === null ? `${API}/api/staff` : `${API}/api/staff/${editingStaffId}`,
        {
          method: editingStaffId === null ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Staff रिकॉर्ड सेव नहीं हुआ।");
      setStaffMessage(editingStaffId === null ? "कर्मचारी रिकॉर्ड सेव हो गया।" : "कर्मचारी रिकॉर्ड अपडेट हो गया।");
      resetStaffForm();
      await loadStaffRecords();
    } catch (error) {
      setStaffMessage(error instanceof Error ? error.message : "Staff रिकॉर्ड सेव नहीं हुआ।");
    } finally {
      setStaffSaving(false);
    }
  }

  function exportPayrollCSV() {
    const headers = [
      "Month", "Staff Code", "Staff Name", "Designation", "Institute",
      "Basic Salary", "Allowance", "Deduction", "Net Salary", "Paid Amount",
      "Balance", "Payment Date", "Payment Mode", "Reference", "Status"
    ];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [
      headers.map(esc).join(","),
      ...payrollList.map((p) => [
        p.payroll_month, p.staff_code, p.staff_name, p.designation, p.institute,
        p.basic_salary, p.allowance, p.deduction, p.net_salary, p.paid_amount,
        p.balance, p.payment_date ?? "", p.payment_mode, p.payment_reference ?? "", p.status,
      ].map(esc).join(","))
    ].join("\\r\\n");
    const blob = new Blob(["\\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `RGP_Salary_Payroll_${payrollMonth || "all"}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function savePayroll(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPayrollSaving(true);
    setPayrollMessage("");
    try {
      const payload = {
        staff_id: Number(payrollForm.staff_id),
        payroll_month: payrollForm.payroll_month,
        basic_salary: Number(payrollForm.basic_salary),
        allowance: Number(payrollForm.allowance || 0),
        deduction: Number(payrollForm.deduction || 0),
        paid_amount: Number(payrollForm.paid_amount || 0),
        payment_date: payrollForm.payment_date || null,
        payment_mode: payrollForm.payment_mode,
        payment_reference: payrollForm.payment_reference || null,
      };
      const netSalary = payload.basic_salary + payload.allowance - payload.deduction;
      if (netSalary < 0) {
        throw new Error("Deduction, Basic Salary और Allowance के कुल से अधिक नहीं हो सकती।");
      }
      if (payload.paid_amount > netSalary) {
        throw new Error(`Paid Amount ₹${payload.paid_amount} है, जबकि Net Salary ₹${netSalary} है। Paid Amount कम करें।`);
      }
      const response = await apiFetch(`${API}/api/payroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        const detail = data.detail;
        const errorMessage = typeof detail === "string"
          ? detail
          : Array.isArray(detail)
            ? detail.map((item: { msg?: string }) => item.msg || JSON.stringify(item)).join(", ")
            : detail ? JSON.stringify(detail) : "Payroll सेव नहीं हुआ।";
        throw new Error(errorMessage);
      }
      setPayrollMessage(`Payroll सेव हो गया। Net Salary: ${money(data.net_salary)}`);
      setPayrollForm({
        staff_id: "", payroll_month: payrollForm.payroll_month, basic_salary: "",
        allowance: "0", deduction: "0", paid_amount: "0", payment_date: "",
        payment_mode: "Cash", payment_reference: "",
      });
      await loadPayrollRecords();
    } catch (error) {
      setPayrollMessage(error instanceof Error ? error.message : "Payroll सेव नहीं हुआ।");
    } finally {
      setPayrollSaving(false);
    }
  }

  async function recordPayrollPayment(record: PayrollRecord) {
    const suggested = String(record.net_salary ?? 0);
    const amountText = window.prompt(
      `कर्मचारी ${record.staff_name} की कुल Net Salary ${money(record.net_salary)} है। अब तक भुगतान सहित कुल कितना भुगतान दर्ज करना है?`,
      suggested
    );
    if (amountText === null) return;
    const amount = Number(amountText);
    if (!Number.isFinite(amount) || amount < 0 || amount > Number(record.net_salary)) {
      window.alert("कृपया 0 से Net Salary तक सही राशि दर्ज करें।");
      return;
    }
    const dateText = window.prompt("भुगतान की तारीख (YYYY-MM-DD) दर्ज करें:", new Date().toISOString().slice(0, 10));
    if (dateText === null) return;
    const mode = window.prompt("Payment Mode (Cash/Bank/UPI):", record.payment_mode || "Cash");
    if (mode === null) return;
    try {
      const params = new URLSearchParams({
        paid_amount: String(amount),
        payment_date: dateText,
        payment_mode: mode,
        payment_reference: record.payment_reference || "",
      });
      const response = await apiFetch(`${API}/api/payroll/${record.id}/payment?${params.toString()}`, { method: "PUT" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Payment अपडेट नहीं हुआ।");
      setPayrollMessage("Salary payment record अपडेट हो गया।");
      await loadPayrollRecords();
    } catch (error) {
      setPayrollMessage(error instanceof Error ? error.message : "Payment अपडेट नहीं हुआ।");
    }
  }

  useEffect(() => {
    if (active === "Staff & Payroll") {
      loadStaffRecords();
      loadPayrollRecords();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  async function saveStudent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStudentFormMessage("");

    const totalFeeValue = Number(studentForm.total_fee);
    if (!Number.isFinite(totalFeeValue) || totalFeeValue < 0) {
      setStudentFormMessage("कुल फीस सही दर्ज करें।");
      return;
    }

    setStudentSaving(true);

    try {
      const editingStudent = editingStudentId !== null
        ? students.find((student) => student.id === editingStudentId)
        : undefined;

      if (editingStudent && totalFeeValue < Number(editingStudent.fee_paid)) {
        setStudentFormMessage(
          `कुल फीस पहले से जमा फीस ${money(editingStudent.fee_paid)} से कम नहीं हो सकती।`
        );
        setStudentSaving(false);
        return;
      }

      const payload = {
        admission_no: studentForm.admission_no.trim(),
        full_name: studentForm.full_name.trim(),
        father_name: studentForm.father_name.trim(),
        course: studentForm.course,
        mobile: studentForm.mobile.trim(),
        total_fee: totalFeeValue,
        institute: studentForm.institute,
        photo_url: studentForm.photo_url || null,
      };

      const response = await apiFetch(
        editingStudentId === null
          ? `${API}/api/students`
          : `${API}/api/students/${editingStudentId}`,
        {
          method: editingStudentId === null ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            editingStudentId === null
              ? { ...payload, fee_paid: 0 }
              : payload
          ),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "विद्यार्थी का रिकॉर्ड सेव नहीं हुआ।");
      }

      setStudentFormMessage(
        editingStudentId === null
          ? "नया एडमिशन सफलतापूर्वक सेव हो गया।"
          : "विद्यार्थी की जानकारी अपडेट हो गई।"
      );
      setEditingStudentId(null);
      setStudentForm({
        admission_no: "",
        full_name: "",
        father_name: "",
        course: "Civil Engineering",
        mobile: "",
        total_fee: "",
        institute: "Rajiv Gandhi Polytechnic",
        photo_url: "",
      });

      const refreshed = await apiFetch(`${API}/api/students`);
      if (refreshed.ok) {
        const list = await refreshed.json();
        setStudents(Array.isArray(list) ? list : []);
      }
    } catch (error) {
      setStudentFormMessage(
        error instanceof Error ? error.message : "कोई त्रुटि हुई।"
      );
    } finally {
      setStudentSaving(false);
    }
  }

  async function deleteStudent(student: Student) {
    const confirmed = window.confirm(
      `क्या आप विद्यार्थी ${student.full_name} (${student.admission_no}) को हटाना चाहते हैं?\n\nइस विद्यार्थी से जुड़ी फीस भुगतान हिस्ट्री और रसीदें भी हट जाएँगी। यह कार्रवाई वापस नहीं की जा सकती।`
    );
    if (!confirmed) return;
    try {
      const response = await apiFetch(`${API}/api/students/${student.id}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "विद्यार्थी हटाया नहीं जा सका।");
      setStudents((current) => current.filter((item) => item.id !== student.id));
      if (editingStudentId === student.id) resetStudentForm();
      if (feeHistory?.student_id === student.id) {
        setFeeHistory(null);
        setFeeHistoryMessage("");
      }
      setStudentFormMessage(`विद्यार्थी ${student.full_name} और उससे जुड़ी फीस रसीदें हटा दी गई हैं।`);
      setStudentImportMessage("");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "विद्यार्थी हटाते समय त्रुटि हुई।");
    }
  }

  async function loadFeeReport() {
    setReportLoading(true);
    setReportMessage("");
    try {
      const params = new URLSearchParams({ period: reportPeriod });
      if (reportPeriod === "daily") params.set("report_date", reportDate);
      else params.set("report_month", reportMonth);

      const response = await apiFetch(`${API}/api/reports/fees?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Fees report लोड नहीं हो सकी।");
      }
      setFeeReport(data);
      if (!data.records || data.records.length === 0) {
        setReportMessage("इस अवधि में कोई फीस जमा नहीं हुई है।");
      }
    } catch (error) {
      setFeeReport(null);
      setReportMessage(
        error instanceof Error ? error.message : "Fees report लोड करने में समस्या हुई।"
      );
    } finally {
      setReportLoading(false);
    }
  }

  function exportFeeReportCSV() {
    if (!feeReport) {
      setReportMessage("पहले रिपोर्ट देखें, फिर Excel के लिए डाउनलोड करें।");
      return;
    }
    const rows = [
      ["Rajiv Gandhi Polytechnic - Fees Collection Report"],
      ["Period", feeReport.period === "daily" ? "Daily" : "Monthly"],
      ["From", feeReport.start_date],
      ["To", feeReport.end_date],
      ["Total Collection", feeReport.total_collection],
      ["Receipt Count", feeReport.receipt_count],
      [],
      ["Receipt No.", "Date", "Admission No.", "Student Name", "Course", "Amount Paid", "Payment Mode"],
      ...(feeReport.records || []).map((r) => [
        r.receipt_no,
        r.payment_date || "",
        r.admission_no || "",
        r.student_name || "",
        r.course || "",
        r.paid_amount,
        r.payment_mode,
      ]),
    ];
    const csv = rows.map((row) => row.map((value) => {
      const safe = String(value ?? "").replace(/"/g, '""');
      return `"${safe}"`;
    }).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `fees-report-${reportPeriod}-${reportPeriod === "daily" ? reportDate : reportMonth}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function saveExpense(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setExpenseMessage("");
    const amount = Number(expenseAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setExpenseMessage("खर्च की राशि शून्य से अधिक दर्ज करें।");
      return;
    }
    setExpenseSaving(true);
    try {
      const response = await apiFetch(`${API}/api/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expense_date: expenseDate,
          category: expenseCategory,
          description: expenseDescription.trim(),
          amount,
          payment_mode: expensePaymentMode,
          reference_no: expenseReference.trim() || null,
          institute: expenseInstitute,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "खर्च सेव नहीं हुआ।");
      setExpenseMessage("खर्च सफलतापूर्वक सेव हो गया।");
      setExpenseDescription("");
      setExpenseAmount("");
      setExpenseReference("");
      await loadExpenseReport();
    } catch (error) {
      setExpenseMessage(error instanceof Error ? error.message : "खर्च सेव करने में समस्या हुई।");
    } finally {
      setExpenseSaving(false);
    }
  }

  async function loadExpenseReport() {
    setExpenseReportLoading(true);
    setExpenseMessage("");
    try {
      const params = new URLSearchParams({ period: expensePeriod });
      if (expensePeriod === "daily") params.set("report_date", expenseReportDate);
      else params.set("report_month", expenseReportMonth);
      if (expenseReportInstitute !== "All") params.set("institute", expenseReportInstitute);
      const response = await apiFetch(`${API}/api/reports/expenses?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "आय-व्यय रिपोर्ट लोड नहीं हुई।");
      setExpenseReport(data);
      if (!data.records || data.records.length === 0) setExpenseMessage("इस अवधि में कोई खर्च रिकॉर्ड नहीं है।");
    } catch (error) {
      setExpenseReport(null);
      setExpenseMessage(error instanceof Error ? error.message : "रिपोर्ट लोड करने में समस्या हुई।");
    } finally {
      setExpenseReportLoading(false);
    }
  }

  function exportExpenseCSV() {
    if (!expenseReport) {
      setExpenseMessage("पहले रिपोर्ट देखें, फिर डाउनलोड करें।");
      return;
    }
    const rows = [
      ["Rajiv Gandhi Polytechnic - Income & Expense Report"],
      ["Period", expenseReport.period === "daily" ? "Daily" : "Monthly"],
      ["From", expenseReport.start_date], ["To", expenseReport.end_date],
      ["Total Fee Income", expenseReport.total_income],
      ["Institute Filter", expenseReport.institute || "All Institutes"],
      ["Operating Expenses", expenseReport.total_expense],
      ["Salary Paid", expenseReport.payroll_paid || 0],
      ["Total Expenses Including Salary", expenseReport.combined_expense ?? expenseReport.total_expense],
      ["Net Balance After Salary", expenseReport.net_balance], [],
      ["Date", "Institute", "Category", "Description", "Amount", "Payment Mode", "Reference No."],
      ...(expenseReport.records || []).map((r) => [r.expense_date, r.institute || "", r.category, r.description, r.amount, r.payment_mode, r.reference_no || ""]),
      [],
      ["Salary Payment Date", "Institute", "Staff Code", "Staff Name", "Salary Paid", "Payment Mode", "Reference"],
      ...(expenseReport.payroll_records || []).map((r) => [r.payment_date || "", r.institute, r.staff_code, r.staff_name, r.paid_amount, r.payment_mode, r.payment_reference || ""]),
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `income-expense-${expensePeriod}-${expensePeriod === "daily" ? expenseReportDate : expenseReportMonth}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function addNotice(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!noticeTitle.trim() || !noticeDetail.trim()) return;

    setNotices((current) => [
      {
        title: noticeTitle.trim(),
        detail: noticeDetail.trim(),
        date: new Date().toLocaleDateString("en-IN"),
      },
      ...current,
    ]);

    setNoticeTitle("");
    setNoticeDetail("");
    setMessage("नया नोटिस इस स्क्रीन पर जोड़ दिया गया है।");
  }

  async function collectFee(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeeMessage("");
    setReceipt(null);
    setReceiptStudent(null);

    if (!selectedStudent) {
      setFeeMessage("पहले विद्यार्थी चुनें।");
      return;
    }

    const amount = Number(paidAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setFeeMessage("जमा राशि सही दर्ज करें।");
      return;
    }

    if (amount > dueFee) {
      setFeeMessage(
        `जमा राशि बकाया फीस ${money(dueFee)} से अधिक नहीं हो सकती।`
      );
      return;
    }

    setCollecting(true);

    try {
      const studentForReceipt = selectedStudent;

      const response = await apiFetch(`${API}/api/fees/collect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentForReceipt.id,
          paid_amount: amount,
          payment_mode: paymentMode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || data.message || "फीस जमा नहीं हो सकी।"
        );
      }

      if (!data.receipt_no) {
        throw new Error(
          "API से Receipt Number नहीं मिला। भुगतान की स्थिति जाँचें; दोबारा फीस जमा न करें।"
        );
      }

      const newReceipt: Receipt = {
        receipt_no: data.receipt_no,
        student_id: studentForReceipt.id,
        admission_no: data.admission_no ?? studentForReceipt.admission_no,
        student_name: data.student_name ?? studentForReceipt.full_name,
        father_name: studentForReceipt.father_name,
        course: studentForReceipt.course,
        mobile: studentForReceipt.mobile,
        institute: studentForReceipt.institute || "Rajiv Gandhi Polytechnic",
        total_fee: data.total_fee ?? studentForReceipt.total_fee,
        paid_amount: data.paid_amount ?? data.amount_paid_now ?? amount,
        payment_mode: data.payment_mode ?? paymentMode,
        payment_date:
          data.payment_date ?? new Date().toISOString().slice(0, 10),
        balance_due:
          data.balance_due ??
          data.due_fee ??
          Math.max(0, dueFee - amount),
      };

      setReceipt(newReceipt);
      setReceiptStudent({
        ...studentForReceipt,
        fee_paid:
          data.total_paid ??
          Number(studentForReceipt.fee_paid) + amount,
        due_fee:
          data.due_fee ??
          Math.max(0, dueFee - amount),
      });

      setPaidAmount("");
      setFeeMessage("फीस सफलतापूर्वक जमा हो गई और रसीद तैयार है।");

      // Refresh student balances and receipt history
      const refreshed = await apiFetch(`${API}/api/students`);
      if (refreshed.ok) {
        const result = await refreshed.json();
        setStudents(Array.isArray(result) ? result : []);
      }

      await loadHistory("");
    } catch (error) {
      setFeeMessage(
        error instanceof Error ? error.message : "कोई त्रुटि हुई।"
      );
    } finally {
      setCollecting(false);
    }
  }

  // Open an existing receipt. This does not collect money.
  async function openOldReceipt(receiptNo: string) {
    setHistoryMessage("");

    try {
      const response = await apiFetch(
        `${API}/api/receipts/${encodeURIComponent(receiptNo)}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "रसीद नहीं खुल सकी।");
      }

      const oldReceipt: Receipt = {
        receipt_no: data.receipt_no,
        student_id: data.student_id,
        admission_no: data.admission_no,
        student_name: data.student_name,
        father_name: data.father_name,
        course: data.course,
        mobile: data.mobile,
        institute: data.institute || students.find((student) => student.id === data.student_id)?.institute || "Rajiv Gandhi Polytechnic",
        total_fee: data.total_fee,
        paid_amount: data.paid_amount,
        payment_mode: data.payment_mode,
        payment_date: data.payment_date,
        balance_due: data.balance_due,
      };

      setReceipt(oldReceipt);
      setReceiptStudent({
        id: data.student_id,
        admission_no: data.admission_no ?? "",
        full_name: data.student_name ?? "",
        father_name: data.father_name ?? "",
        course: data.course ?? "",
        mobile: data.mobile ?? "",
        institute: data.institute || students.find((student) => student.id === data.student_id)?.institute || "Rajiv Gandhi Polytechnic",
        total_fee: data.total_fee ?? 0,
        fee_paid:
          Number(data.total_fee ?? 0) -
          Number(data.balance_due ?? 0),
        due_fee: data.balance_due ?? 0,
      });

      setActive("Receipt History");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setHistoryMessage(
        error instanceof Error ? error.message : "रसीद नहीं खुल सकी।"
      );
    }
  }

  // Print only the receipt in a separate window
  function printReceipt() {
    const receiptElement = document.getElementById("fee-receipt");

    if (!receiptElement || !receipt) {
      alert("रसीद नहीं मिली। पहले रसीद खोलें।");
      return;
    }

    const printWindow = window.open("", "_blank", "width=900,height=750");

    if (!printWindow) {
      alert(
        "ब्राउज़र ने नई विंडो रोक दी है। इस वेबसाइट के लिए Pop-ups Allow करें।"
      );
      return;
    }

    // Build a clean receipt document without copying page buttons.
    const r = receipt;
    const studentName = r.student_name ?? receiptStudent?.full_name ?? "";
    const admissionNo =
      r.admission_no ?? receiptStudent?.admission_no ?? "";
    const fatherName =
      r.father_name ?? receiptStudent?.father_name ?? "—";
    const course = r.course ?? receiptStudent?.course ?? "";
    const institute = r.institute ?? receiptStudent?.institute ?? "Rajiv Gandhi Polytechnic";

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Fee Receipt ${r.receipt_no}</title>
        <style>
          @page { size: A4 portrait; margin: 14mm; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            color: #102b52;
            background: #fff;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 14px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .receipt { width: 100%; border: 1px solid #cbd5e1; padding: 26px; }
          .header { text-align: center; border-bottom: 3px solid #102b52; padding-bottom: 18px; }
          .eyebrow { color: #1d4ed8; font-size: 11px; font-weight: bold; letter-spacing: 2px; }
          h1 { font-size: 25px; margin: 9px 0; }
          h2 { font-size: 17px; margin: 0; font-weight: normal; }
          .meta { display: flex; justify-content: space-between; gap: 12px; margin: 20px 0; flex-wrap: wrap; }
          .details { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; line-height: 1.5; }
          table { width: 100%; border-collapse: collapse; margin-top: 24px; }
          th, td { border: 1px solid #cbd5e1; padding: 12px; }
          th { background: #eff6ff; text-align: left; }
          .right { text-align: right; }
          .note { margin-top: 22px; font-size: 11px; color: #64748b; line-height: 1.5; }
          .signatures { display: flex; justify-content: space-between; gap: 40px; margin-top: 75px; }
          .signatures div { width: 45%; border-top: 1px solid #64748b; padding-top: 8px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <div class="eyebrow">OFFICIAL FEE RECEIPT</div>
            <h1>${escapeHTML(institute)}</h1>
            <h2>Student Fee Payment Receipt</h2>
          </div>
          <div class="meta">
            <div><strong>Receipt No:</strong> ${escapeHTML(r.receipt_no)}</div>
            <div><strong>Date:</strong> ${escapeHTML(formatDate(r.payment_date))}</div>
          </div>
          <div class="details">
            <div><strong>Admission No:</strong> ${escapeHTML(admissionNo)}</div>
            <div><strong>Student Name:</strong> ${escapeHTML(studentName)}</div>
            <div><strong>Father's Name:</strong> ${escapeHTML(fatherName)}</div>
            <div><strong>Course:</strong> ${escapeHTML(course)}</div>
            <div><strong>Payment Mode:</strong> ${escapeHTML(r.payment_mode)}</div>
          </div>
          <table>
            <thead><tr><th>Description</th><th class="right">Amount</th></tr></thead>
            <tbody>
              <tr><td>Fees received</td><td class="right"><strong>${escapeHTML(money(r.paid_amount))}</strong></td></tr>
              <tr><td>Total Course Fee</td><td class="right">${escapeHTML(money(r.total_fee))}</td></tr>
              <tr><td>Paid up to this receipt</td><td class="right">${escapeHTML(money(Number(r.total_fee) - Number(r.balance_due ?? 0)))}</td></tr>
              <tr><td><strong>Balance Due after this receipt</strong></td><td class="right"><strong>${escapeHTML(money(r.balance_due))}</strong></td></tr>
            </tbody>
          </table>
          <div class="note">This receipt confirms receipt of the amount mentioned above. Please retain it for your records.</div>
          <div class="signatures">
            <div>Student / Parent</div>
            <div>Authorized Signatory</div>
          </div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.focus();
              window.print();
            }, 400);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  function escapeHTML(value: unknown): string {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-800">
      <header className="no-print flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-[#071a3d] via-[#0b2450] to-[#174a8b] px-5 py-6 text-white shadow-lg sm:px-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-200">
            College Management
          </p>
          <h1 className="mt-1 text-xl font-extrabold sm:text-2xl">
            Rajiv Gandhi Polytechnic
          </h1>
          <p className="mt-1 text-sm text-blue-100">
            Administration Dashboard
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/"
            className="rounded-lg border border-white/30 px-4 py-2 text-sm font-bold hover:bg-white/10"
          >
            ← View Website
          </a>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem("rgp_admin_token");
              localStorage.removeItem("rgp_admin_username");
              window.location.replace("/admin/login");
            }}
            className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-[#0b2450] hover:bg-blue-50"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="no-print mx-auto grid max-w-7xl gap-6 px-4 py-7 sm:px-6 lg:grid-cols-[230px_1fr]">
        <aside className="h-fit rounded-2xl bg-white p-4 shadow-sm">
          <p className="mb-3 px-3 text-xs font-bold uppercase tracking-widest text-slate-400">
            Main Menu
          </p>

          <nav className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            {menu.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setActive(item);
                  setMessage("");
                  setFeeMessage("");
                }}
                className={`rounded-xl px-4 py-3 text-left text-sm font-bold transition ${
                  active === item
                    ? "bg-blue-800 text-white"
                    : "text-slate-600 hover:bg-blue-50 hover:text-blue-800"
                }`}
              >
                {item === "Dashboard" && "▦  "}
                {item === "Notices" && "▤  "}
                {item === "Courses" && "▣  "}
                {item === "Admissions" && "♙  "}
                {item === "Student Management" && "👥  "}
                {item === "Student ID Cards" && "🪪  "}
                {item === "Staff & Payroll" && "🧑‍💼  "}
                {item === "Fees & Receipts" && "₹  "}
                {item === "Receipt History" && "▤  "}
                {item === "Fees Reports" && "📊  "}
                {item === "Expense Management" && "💸  "}
                {item === "Website" && "↗  "}
                {item}
              </button>
            ))}
          </nav>

          <div className="mt-6 rounded-xl bg-amber-50 p-4">
            <p className="text-sm font-bold text-amber-900">Setup in Progress</p>
            <p className="mt-2 text-xs leading-5 text-amber-800">
              यह Admin Panel अभी विकासाधीन है। सुरक्षित Admin Login अभी अलग
              से बनाना बाकी है।
            </p>
          </div>
        </aside>

        <section className="min-w-0">
          <div className="mb-6">
            <p className="text-sm font-medium text-slate-500">
              Administration / {active}
            </p>
            <h2 className="mt-2 text-3xl font-black text-[#102b52]">
              {active}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Manage your college website from one place.
            </p>
          </div>

          {active === "Dashboard" && (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-500">Live figures from your database · Expenses shown for the current month</p>
                <button
                  type="button"
                  onClick={() => setDashboardRefresh((value) => value + 1)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold hover:bg-slate-50"
                >
                  Refresh Dashboard
                </button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    label: "Total Students",
                    value: dashboardStats.studentCount.toLocaleString("en-IN"),
                    note: "Registered students",
                    color: "bg-blue-50 text-blue-800",
                  },
                  {
                    label: "Fees Collected",
                    value: money(dashboardStats.feesCollected),
                    note: "Total paid amount",
                    color: "bg-emerald-50 text-emerald-800",
                  },
                  {
                    label: "Fees Due",
                    value: money(dashboardStats.feesDue),
                    note: "Outstanding student fees",
                    color: "bg-amber-50 text-amber-800",
                  },
                  {
                    label: "This Month's Expenses",
                    value: money(dashboardStats.monthlyExpenses),
                    note: "Expenses recorded this month",
                    color: "bg-rose-50 text-rose-800",
                  },
                ].map((card) => (
                  <div
                    key={card.label}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <p className="text-sm font-semibold text-slate-500">{card.label}</p>
                    <p className="mt-4 break-words text-2xl font-black text-[#102b52]">
                      {dashboardLoading ? "Loading..." : card.value}
                    </p>
                    <span className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-bold ${card.color}`}>
                      {card.note}
                    </span>
                  </div>
                ))}
              </div>
              {dashboardMessage && (
                <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
                  {dashboardMessage} अगर आँकड़े नहीं दिखें, तो Backend चालू है और API काम कर रही है या नहीं जाँचें।
                </p>
              )}

              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="text-lg font-extrabold">Quick Actions</h3>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button onClick={() => setActive("Notices")} className="rounded-lg bg-blue-800 px-5 py-3 text-sm font-bold text-white">Manage Notices</button>
                  <button onClick={() => setActive("Courses")} className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-bold">View Courses</button>
                  <button onClick={() => setActive("Admissions")} className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-bold">Admission Enquiries</button>
                  <button onClick={() => setActive("Student Management")} className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-bold">Student Management</button>
                  <button onClick={() => setActive("Fees & Receipts")} className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-bold">Collect Fees</button>
                  <button onClick={() => setActive("Receipt History")} className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-bold">Receipt History</button>
                  <button onClick={() => setActive("Fees Reports")} className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-bold">Fees Reports</button>
                  <button onClick={() => setActive("Expense Management")} className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-bold">Expense Management</button>
                </div>
              </div>
              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="text-lg font-extrabold">System Status</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Website</p><p className="mt-2 font-extrabold text-emerald-700">Available</p></div>
                  <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Courses</p><p className="mt-2 font-extrabold">3 Branches</p></div>
                  <div className="rounded-xl bg-amber-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-amber-800">Admin Login</p><p className="mt-2 font-extrabold text-amber-900">Setup Pending</p></div>
                </div>
                <p className="mt-4 text-xs leading-5 text-slate-500">ध्यान दें: Dashboard के आँकड़े मौजूदा Student और Expense API से आते हैं। सुरक्षित Admin Login अगला अलग चरण है।</p>
              </div>
            </>
          )}

          {active === "Notices" && (
            <>
              <form
                onSubmit={addNotice}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <h3 className="text-lg font-extrabold">Add a Notice</h3>
                <label className="mt-5 block text-sm font-bold">
                  Notice Title
                  <input
                    required
                    value={noticeTitle}
                    onChange={(e) => setNoticeTitle(e.target.value)}
                    placeholder="Enter notice title"
                    className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal"
                  />
                </label>
                <label className="mt-4 block text-sm font-bold">
                  Notice Details
                  <textarea
                    required
                    value={noticeDetail}
                    onChange={(e) => setNoticeDetail(e.target.value)}
                    placeholder="Write notice details"
                    rows={3}
                    className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal"
                  />
                </label>
                <button
                  type="submit"
                  className="mt-5 rounded-lg bg-blue-800 px-6 py-3 font-bold text-white"
                >
                  + Add Notice
                </button>
                {message && (
                  <p className="mt-4 text-sm font-semibold text-emerald-700">
                    {message}
                  </p>
                )}
              </form>

              <div className="mt-6 space-y-3">
                {notices.map((notice, index) => (
                  <article
                    key={`${notice.title}-${index}`}
                    className="rounded-xl border border-slate-200 bg-white p-5"
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <h3 className="font-extrabold">{notice.title}</h3>
                      <span className="text-xs text-slate-500">{notice.date}</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {notice.detail}
                    </p>
                  </article>
                ))}
              </div>
              <p className="mt-4 text-xs text-slate-500">
                Demo: notices अभी database में सेव नहीं होते।
              </p>
            </>
          )}

          {active === "Courses" && (
            <div className="space-y-4">
              {[
                ["Civil Engineering", "CE"],
                ["Mechanical Engineering", "ME"],
                ["Electrical Engineering", "EE"],
              ].map(([name, code]) => (
                <div
                  key={code}
                  className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 font-black text-blue-900">
                    {code}
                  </div>
                  <div>
                    <h3 className="font-extrabold">{name}</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Diploma course · Confirm current details before publication
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {active === "Student Management" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-extrabold">
                      {editingStudentId === null ? "New Student Admission" : "Edit Student Details"}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      एडमिशन रिकॉर्ड PostgreSQL डेटाबेस में सेव होगा।
                    </p>
                  </div>
                  {editingStudentId !== null && (
                    <button
                      type="button"
                      onClick={resetStudentForm}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold hover:bg-slate-50"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                <form onSubmit={saveStudent} className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-bold">
                    Admission Number
                    <input
                      required
                      maxLength={30}
                      value={studentForm.admission_no}
                      onChange={(e) => setStudentForm({ ...studentForm, admission_no: e.target.value })}
                      placeholder="जैसे RGP2026-001"
                      className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal"
                    />
                  </label>

                  <label className="text-sm font-bold">
                    Student Full Name
                    <input
                      required
                      maxLength={150}
                      value={studentForm.full_name}
                      onChange={(e) => setStudentForm({ ...studentForm, full_name: e.target.value })}
                      placeholder="विद्यार्थी का पूरा नाम"
                      className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal"
                    />
                  </label>

                  <label className="text-sm font-bold">
                    Father's Name
                    <input
                      required
                      maxLength={150}
                      value={studentForm.father_name}
                      onChange={(e) => setStudentForm({ ...studentForm, father_name: e.target.value })}
                      placeholder="पिता का पूरा नाम"
                      className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal"
                    />
                  </label>

                  <label className="text-sm font-bold">
                    Mobile Number
                    <input
                      required
                      type="tel"
                      minLength={10}
                      maxLength={15}
                      value={studentForm.mobile}
                      onChange={(e) => setStudentForm({ ...studentForm, mobile: e.target.value })}
                      placeholder="10 अंकों का मोबाइल नंबर"
                      className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal"
                    />
                  </label>

                  <label className="text-sm font-bold">
                    Institute
                    <select
                      required
                      value={studentForm.institute}
                      onChange={(e) => {
                        const institute = e.target.value;
                        const firstCourse = institute === "Rajiv Gandhi ITI" ? "Electrician"
                          : institute === "Gramodyog Sewa Sansthan" ? "D.Ed (HI)"
                          : "Civil Engineering";
                        setStudentForm({ ...studentForm, institute, course: firstCourse });
                      }}
                      className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-normal"
                    >
                      <option>Rajiv Gandhi Polytechnic</option>
                      <option>Rajiv Gandhi ITI</option>
                      <option>Gramodyog Sewa Sansthan</option>
                    </select>
                  </label>

                  <label className="text-sm font-bold">
                    Course
                    <select
                      required
                      value={studentForm.course}
                      onChange={(e) => setStudentForm({ ...studentForm, course: e.target.value })}
                      className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-normal"
                    >
                      {studentForm.institute === "Rajiv Gandhi Polytechnic" && <>
                        <option value="Civil Engineering">Civil Engineering</option>
                        <option value="Mechanical Engineering">Mechanical Engineering</option>
                        <option value="Electrical Engineering">Electrical Engineering</option>
                      </>}
                      {studentForm.institute === "Rajiv Gandhi ITI" && <>
                        <option value="Electrician">Electrician</option>
                        <option value="Fitter">Fitter</option>
                        <option value="Welder">Welder</option>
                      </>}
                      {studentForm.institute === "Gramodyog Sewa Sansthan" && <>
                        <option value="D.Ed (HI)">D.Ed (HI)</option>
                        <option value="D.Ed Special Education (MR)">D.Ed Special Education (MR)</option>
                      </>}
                    </select>
                  </label>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-bold">Student Photo (JPG/PNG, up to 1.5 MB)
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (!file.type.startsWith("image/")) { setStudentFormMessage("कृपया JPG, PNG या WebP फोटो चुनें।"); e.currentTarget.value = ""; return; }
                          if (file.size > 1.5 * 1024 * 1024) { setStudentFormMessage("फोटो 1.5 MB से छोटी होनी चाहिए।"); e.currentTarget.value = ""; return; }
                          const reader = new FileReader();
                          reader.onload = () => setStudentForm((current) => ({ ...current, photo_url: String(reader.result || "") }));
                          reader.onerror = () => setStudentFormMessage("फोटो पढ़ी नहीं जा सकी। दोबारा कोशिश करें।");
                          reader.readAsDataURL(file);
                        }}
                        className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-normal"
                      />
                    </label>
                    {studentForm.photo_url && (
                      <div className="mt-3 flex items-center gap-3">
                        <img src={studentForm.photo_url} alt="Student photo preview" className="h-24 w-20 rounded border border-slate-300 object-cover" />
                        <button type="button" onClick={() => setStudentForm((current) => ({ ...current, photo_url: "" }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold">Remove Photo</button>
                      </div>
                    )}
                  </div>

                  <label className="text-sm font-bold">
                    Total Course Fee (₹)
                    <input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      value={studentForm.total_fee}
                      onChange={(e) => setStudentForm({ ...studentForm, total_fee: e.target.value })}
                      placeholder="जैसे 60000"
                      className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal"
                    />
                  </label>

                  <div className="sm:col-span-2 flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={studentSaving}
                      className="rounded-lg bg-blue-800 px-6 py-3 font-bold text-white hover:bg-blue-950 disabled:opacity-50"
                    >
                      {studentSaving ? "Saving..." : editingStudentId === null ? "Save Admission" : "Update Student"}
                    </button>
                    {editingStudentId === null && (
                      <button
                        type="button"
                        onClick={resetStudentForm}
                        className="rounded-lg border border-slate-300 px-6 py-3 font-bold hover:bg-slate-50"
                      >
                        Clear Form
                      </button>
                    )}
                  </div>
                </form>

                {studentFormMessage && (
                  <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm font-semibold text-slate-700">
                    {studentFormMessage}
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-white p-6 shadow-sm">
                <h3 className="text-lg font-extrabold text-[#102b52]">Excel Import / Export — पुराने विद्यार्थी भी जोड़ें</h3>
                <p className="mt-2 text-sm text-slate-600">2024 से पुराने विद्यार्थियों की Excel फ़ाइल चुनें। Admission No पहले से मौजूद होने पर रिकॉर्ड दोबारा नहीं जोड़ा जाएगा।</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <label className={`cursor-pointer rounded-lg bg-blue-800 px-4 py-3 text-sm font-bold text-white hover:bg-blue-950 ${studentImporting ? "pointer-events-none opacity-50" : ""}`}>
                    {studentImporting ? "Import हो रहा है..." : "Excel फ़ाइल Import करें"}
                    <input type="file" accept=".xlsx,.xls,.csv" className="hidden" disabled={studentImporting} onChange={(e) => { const f=e.target.files?.[0]; if (f) void importStudentsExcel(f); e.currentTarget.value=""; }} />
                  </label>
                  <button type="button" onClick={exportStudentsExcel} className="rounded-lg border border-blue-300 bg-white px-4 py-3 text-sm font-bold text-blue-900 hover:bg-blue-50">Export Excel</button>
                  <button type="button" onClick={downloadStudentTemplate} className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-bold hover:bg-slate-50">Download Excel Template</button>
                </div>
                {studentImportMessage && <p className="mt-4 whitespace-normal rounded-lg border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-700">{studentImportMessage}</p>}
                <p className="mt-3 text-xs text-slate-500">जरूरी कॉलम: Admission_No, Student_Name, Father_Name, Mobile, Institute, Course. वैकल्पिक: Admission_Date (YYYY-MM-DD), Total_Fee, Fee_Paid. Import से पहले database backup रखें।</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-extrabold">Student Records</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      कुल विद्यार्थी: {students.filter((student) => studentInstituteFilter === "All" || (student.institute || "Rajiv Gandhi Polytechnic") === studentInstituteFilter).length}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={loadStudentRecords}
                    disabled={loadingStudents}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold hover:bg-slate-50 disabled:opacity-50"
                  >
                    {loadingStudents ? "Loading..." : "Refresh List"}
                  </button>
                </div>

                <label className="mt-5 block text-sm font-bold">
                  संस्थान के अनुसार विद्यार्थी देखें
                  <select
                    value={studentInstituteFilter}
                    onChange={(e) => setStudentInstituteFilter(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-normal"
                  >
                    <option value="All">सभी संस्थान</option>
                    {institutes.map((institute) => (
                      <option key={institute} value={institute}>{institute}</option>
                    ))}
                  </select>
                </label>

                <input
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="नाम या Admission Number से खोजें"
                  className="mt-5 w-full rounded-lg border border-slate-300 px-4 py-3"
                />

                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[900px] border-collapse text-sm">
                    <thead>
                      <tr className="bg-blue-50 text-left">
                        <th className="border border-slate-200 p-3">Admission No.</th>
                        <th className="border border-slate-200 p-3">Student Name</th>
                        <th className="border border-slate-200 p-3">Father's Name</th>
                        <th className="border border-slate-200 p-3">Course</th>
                        <th className="border border-slate-200 p-3">Mobile</th>
                        <th className="border border-slate-200 p-3">Total Fee</th>
                        <th className="border border-slate-200 p-3">Paid</th>
                        <th className="border border-slate-200 p-3">Due</th>
                        <th className="border border-slate-200 p-3">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students
                        .filter((student) => {
                          const matchesInstitute = studentInstituteFilter === "All" ||
                            (student.institute || "Rajiv Gandhi Polytechnic") === studentInstituteFilter;
                          const term = studentSearch.trim().toLowerCase();
                          const matchesSearch = !term ||
                            student.admission_no.toLowerCase().includes(term) ||
                            student.full_name.toLowerCase().includes(term) || (student.mobile || "").toLowerCase().includes(term);
                          return matchesInstitute && matchesSearch;
                        })
                        .map((student) => (
                          <tr key={student.id} className="hover:bg-slate-50">
                            <td className="border border-slate-200 p-3 font-bold">{student.admission_no}</td>
                            <td className="border border-slate-200 p-3">{student.full_name}</td>
                            <td className="border border-slate-200 p-3">{student.father_name ?? "—"}</td>
                            <td className="border border-slate-200 p-3">{student.course}</td>
                            <td className="border border-slate-200 p-3">{student.mobile ?? "—"}</td>
                            <td className="border border-slate-200 p-3">{money(student.total_fee)}</td>
                            <td className="border border-slate-200 p-3 text-emerald-700">{money(student.fee_paid)}</td>
                            <td className="border border-slate-200 p-3 font-bold text-amber-700">
                              {money(student.due_fee ?? Number(student.total_fee) - Number(student.fee_paid))}
                            </td>
                            <td className="border border-slate-200 p-3">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => startEditingStudent(student)}
                                  className="rounded-lg bg-blue-800 px-3 py-2 font-bold text-white hover:bg-blue-950"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void deleteStudent(student)}
                                  className="rounded-lg bg-red-600 px-3 py-2 font-bold text-white hover:bg-red-700"
                                >
                                  Delete
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openStudentFeeHistory(student)}
                                  disabled={feeHistoryLoading}
                                  className="rounded-lg bg-emerald-700 px-3 py-2 font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
                                >
                                  Fee History
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      {!loadingStudents && students.filter((student) => {
                        const term = studentSearch.trim().toLowerCase();
                        return !term ||
                          student.admission_no.toLowerCase().includes(term) ||
                          student.full_name.toLowerCase().includes(term) || (student.mobile || "").toLowerCase().includes(term);
                      }).length === 0 && (
                        <tr>
                          <td colSpan={9} className="border border-slate-200 p-6 text-center text-slate-500">
                            कोई विद्यार्थी नहीं मिला।
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <p className="mt-4 text-xs leading-5 text-slate-500">
                  जमा फीस और बकाया राशि डेटाबेस के रिकॉर्ड से दिखाई जाती है। भुगतान राशि इस फॉर्म से नहीं बदली जा सकती।
                </p>
              </div>

              {(feeHistoryLoading || feeHistoryMessage || feeHistory) && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-extrabold">Student Fee History</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        चुने गए विद्यार्थी की सभी फीस रसीदें और बकाया राशि।
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFeeHistory(null);
                        setFeeHistoryMessage("");
                      }}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold hover:bg-slate-50"
                    >
                      Close
                    </button>
                  </div>

                  {feeHistoryLoading && (
                    <p className="mt-4 text-sm text-slate-500">Fee History लोड हो रही है...</p>
                  )}

                  {feeHistoryMessage && (
                    <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm font-semibold text-slate-700">
                      {feeHistoryMessage}
                    </p>
                  )}

                  {feeHistory && (
                    <>
                      <h4 className="mt-5 text-lg font-extrabold">{feeHistory.student_name}</h4>
                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl bg-blue-50 p-4">
                          <p className="text-xs font-bold text-blue-800">Total Fee</p>
                          <p className="mt-2 text-xl font-black text-blue-950">{money(feeHistory.total_fee)}</p>
                        </div>
                        <div className="rounded-xl bg-emerald-50 p-4">
                          <p className="text-xs font-bold text-emerald-800">Total Paid</p>
                          <p className="mt-2 text-xl font-black text-emerald-950">{money(feeHistory.total_paid)}</p>
                        </div>
                        <div className="rounded-xl bg-amber-50 p-4">
                          <p className="text-xs font-bold text-amber-800">Due Fee</p>
                          <p className="mt-2 text-xl font-black text-amber-950">{money(feeHistory.due_fee)}</p>
                        </div>
                      </div>

                      <div className="mt-5 overflow-x-auto">
                        <table className="w-full min-w-[700px] border-collapse text-sm">
                          <thead>
                            <tr className="bg-blue-50 text-left">
                              <th className="border border-slate-200 p-3">Receipt No.</th>
                              <th className="border border-slate-200 p-3">Date</th>
                              <th className="border border-slate-200 p-3">Paid Amount</th>
                              <th className="border border-slate-200 p-3">Payment Mode</th>
                              <th className="border border-slate-200 p-3">Balance After Receipt</th>
                            </tr>
                          </thead>
                          <tbody>
                            {feeHistory.payments.map((payment) => (
                              <tr key={payment.receipt_no} className="hover:bg-slate-50">
                                <td className="border border-slate-200 p-3 font-bold">{payment.receipt_no}</td>
                                <td className="border border-slate-200 p-3">{formatDate(payment.payment_date)}</td>
                                <td className="border border-slate-200 p-3 font-bold text-emerald-700">{money(payment.paid_amount)}</td>
                                <td className="border border-slate-200 p-3">{payment.payment_mode}</td>
                                <td className="border border-slate-200 p-3">{money(payment.balance_due)}</td>
                              </tr>
                            ))}
                            {feeHistory.payments.length === 0 && (
                              <tr>
                                <td colSpan={5} className="border border-slate-200 p-6 text-center text-slate-500">
                                  अभी कोई फीस भुगतान रिकॉर्ड नहीं है।
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {active === "Admissions" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-extrabold">Admission Enquiries</h3>
              <p className="mt-3 leading-7 text-slate-600">
                Enquiry records यहाँ तभी दिखाई देंगे जब enquiry API और database
                जोड़े जाएँगे।
              </p>
              <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                अभी enquiry records लोड नहीं किए गए हैं।
              </div>
            </div>
          )}

          {active === "Student ID Cards" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-xl font-extrabold">Individual Student ID Card</h3>
                <p className="mt-1 text-sm text-slate-500">संस्थान और विद्यार्थी चुनें, फिर ID Card प्रिंट करें। QR में केवल Admission Number और Institute का नाम रहेगा।</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-bold">Institute
                    <select value={idCardInstitute} onChange={(e) => { setIdCardInstitute(e.target.value); setIdCardStudentId(""); }} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-normal">
                      {institutes.map((name) => <option key={name} value={name}>{name}</option>)}
                    </select>
                  </label>
                  <label className="text-sm font-bold">Student
                    <select value={idCardStudentId} onChange={(e) => setIdCardStudentId(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-normal">
                      <option value="">-- विद्यार्थी चुनें --</option>
                      {students.filter((student) => (student.institute || "Rajiv Gandhi Polytechnic") === idCardInstitute).map((student) => <option key={student.id} value={String(student.id)}>{student.admission_no} — {student.full_name}</option>)}
                    </select>
                  </label>
                </div>
                {(() => {
                  const student = students.find((item) => String(item.id) === idCardStudentId);
                  if (!student) return <p className="mt-5 text-sm text-slate-500">ID Card देखने के लिए विद्यार्थी चुनें।</p>;
                  return <div className="mt-6 flex flex-col items-start gap-4">
                    <div id="student-id-card" className="w-full max-w-[560px] overflow-hidden rounded-2xl border-2 border-blue-900 bg-white shadow-md">
                      <div className="bg-[#0b2450] px-5 py-4 text-center text-white">
                        <p className="text-xs font-bold uppercase tracking-widest">Student Identity Card</p>
                        <h4 className="mt-1 text-lg font-extrabold">{student.institute || "Rajiv Gandhi Polytechnic"}</h4>
                      </div>
                      <div className="grid grid-cols-[110px_1fr_88px] items-center gap-4 p-5">
                        {student.photo_url ? <img src={student.photo_url} alt={student.full_name} className="h-32 w-[100px] rounded-lg border object-cover" /> : <div className="flex h-32 w-[100px] items-center justify-center rounded-lg border bg-slate-100 text-center text-xs text-slate-500">Photo not uploaded</div>}
                        <div className="space-y-2 text-sm">
                          <p className="text-lg font-extrabold text-[#102b52]">{student.full_name}</p>
                          <p><b>Admission No:</b> {student.admission_no}</p>
                          <p><b>Father:</b> {student.father_name || "—"}</p>
                          <p><b>Course:</b> {student.course}</p>
                          <p><b>Mobile:</b> {student.mobile || "—"}</p>
                        </div>
                        {idCardQr ? <img src={idCardQr} alt="Student ID QR code" className="h-[84px] w-[84px]" /> : <div className="h-[84px] w-[84px] rounded border bg-slate-50" />}
                      </div>
                      <div className="border-t bg-blue-50 px-5 py-2 text-center text-xs font-semibold text-blue-900">Valid only for the student named on this card</div>
                    </div>
                    <button type="button" onClick={() => {
                      const card = document.getElementById("student-id-card");
                      if (!card) return;
                      const w = window.open("", "_blank", "width=850,height=650");
                      if (!w) { window.alert("Print window blocked. Please allow pop-ups for this site."); return; }
                      w.document.write(`<!DOCTYPE html><html><head><title>Student ID Card</title><style>body{font-family:Arial,sans-serif;margin:20px}.card{width:560px;border:2px solid #1e3a8a;border-radius:16px;overflow:hidden}img{object-fit:cover} @page{size:auto;margin:10mm}</style></head><body>${card.outerHTML}<script>window.onload=()=>{window.focus();window.print()}</script></body></html>`);
                      w.document.close();
                    }} className="rounded-lg bg-blue-800 px-6 py-3 font-bold text-white hover:bg-blue-950">Print ID Card</button>
                  </div>;
                })()}
              </div>
            </div>
          )}

          {active === "Staff & Payroll" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-extrabold">{editingStaffId === null ? "Add Staff Member" : "Edit Staff Member"}</h3>
                    <p className="mt-1 text-sm text-slate-500">कर्मचारी का रिकॉर्ड PostgreSQL में सेव होगा।</p>
                  </div>
                  {editingStaffId !== null && (
                    <button type="button" onClick={resetStaffForm} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold">Cancel Edit</button>
                  )}
                </div>
                <form onSubmit={saveStaff} className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <label className="text-sm font-bold">Staff Code
                    <input required maxLength={30} value={staffForm.staff_code} onChange={(e) => setStaffForm({...staffForm, staff_code:e.target.value})} placeholder="RGP-STAFF-001" className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal"/>
                  </label>
                  <label className="text-sm font-bold">Full Name
                    <input required maxLength={150} value={staffForm.full_name} onChange={(e) => setStaffForm({...staffForm, full_name:e.target.value})} placeholder="कर्मचारी का नाम" className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal"/>
                  </label>
                  <label className="text-sm font-bold">Designation
                    <input required maxLength={100} value={staffForm.designation} onChange={(e) => setStaffForm({...staffForm, designation:e.target.value})} placeholder="Principal / Lecturer / Clerk" className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal"/>
                  </label>
                  <label className="text-sm font-bold">Mobile Number
                    <input required minLength={10} maxLength={15} value={staffForm.mobile} onChange={(e) => setStaffForm({...staffForm, mobile:e.target.value})} placeholder="मोबाइल नंबर" className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal"/>
                  </label>
                  <label className="text-sm font-bold">Institute
                    <select value={staffForm.institute} onChange={(e) => setStaffForm({...staffForm, institute:e.target.value})} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-normal">
                      {institutes.map((institute) => <option key={institute} value={institute}>{institute}</option>)}
                    </select>
                  </label>
                  <label className="text-sm font-bold">Joining Date
                    <input type="date" value={staffForm.joining_date} onChange={(e) => setStaffForm({...staffForm, joining_date:e.target.value})} className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal"/>
                  </label>
                  <label className="text-sm font-bold">Monthly Salary (₹)
                    <input required type="number" min="0" step="0.01" value={staffForm.monthly_salary} onChange={(e) => setStaffForm({...staffForm, monthly_salary:e.target.value})} placeholder="जैसे 25000" className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal"/>
                  </label>
                  <div className="flex items-end gap-3">
                    <button disabled={staffSaving} type="submit" className="rounded-lg bg-blue-800 px-6 py-3 font-bold text-white disabled:opacity-50">{staffSaving ? "Saving..." : editingStaffId === null ? "Save Staff" : "Update Staff"}</button>
                    <button type="button" onClick={resetStaffForm} className="rounded-lg border border-slate-300 px-5 py-3 font-bold">Clear</button>
                  </div>
                </form>
                {staffMessage && <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm font-semibold text-slate-700">{staffMessage}</p>}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><h3 className="text-xl font-extrabold">Staff Register</h3><p className="mt-1 text-sm text-slate-500">कुल कर्मचारी: {staffList.length}</p></div>
                  <div className="flex flex-wrap gap-2">
                    <select value={staffInstituteFilter} onChange={(e) => setStaffInstituteFilter(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                      <option value="All">All Institutes</option>{institutes.map((i) => <option key={i} value={i}>{i}</option>)}
                    </select>
                    <button type="button" onClick={loadStaffRecords} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold">Refresh</button>
                  </div>
                </div>
                <input value={staffSearch} onChange={(e) => setStaffSearch(e.target.value)} placeholder="नाम, Staff Code, पद या मोबाइल से खोजें" className="mt-4 w-full rounded-lg border border-slate-300 px-4 py-3"/>
                {staffLoading ? <p className="mt-4 text-sm text-slate-500">Staff लोड हो रहा है...</p> : (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[950px] border-collapse text-sm">
                      <thead><tr className="bg-blue-50 text-left">{["Staff Code","Name","Designation","Mobile","Institute","Joining Date","Monthly Salary","Status","Action"].map((h)=><th key={h} className="border border-slate-200 p-3">{h}</th>)}</tr></thead>
                      <tbody>
                        {staffList.filter((s) => {
                          const term=staffSearch.trim().toLowerCase();
                          return (!term || [s.staff_code,s.full_name,s.designation,s.mobile,s.institute].some(v=>String(v||"").toLowerCase().includes(term))) &&
                            (staffInstituteFilter==="All" || s.institute===staffInstituteFilter);
                        }).map((s)=><tr key={s.id} className="hover:bg-slate-50">
                          <td className="border border-slate-200 p-3 font-bold">{s.staff_code}</td><td className="border border-slate-200 p-3">{s.full_name}</td><td className="border border-slate-200 p-3">{s.designation}</td><td className="border border-slate-200 p-3">{s.mobile}</td><td className="border border-slate-200 p-3">{s.institute}</td><td className="border border-slate-200 p-3">{s.joining_date || "—"}</td><td className="border border-slate-200 p-3">{money(s.monthly_salary)}</td><td className="border border-slate-200 p-3">{s.is_active ? "Active" : "Inactive"}</td><td className="border border-slate-200 p-3"><button type="button" onClick={()=>editStaffRecord(s)} className="rounded-lg bg-blue-800 px-3 py-2 font-bold text-white">Edit</button></td>
                        </tr>)}
                        {staffList.filter((s)=>{const term=staffSearch.trim().toLowerCase();return (!term||[s.staff_code,s.full_name,s.designation,s.mobile,s.institute].some(v=>String(v||"").toLowerCase().includes(term)))&&(staffInstituteFilter==="All"||s.institute===staffInstituteFilter)}).length===0 && <tr><td colSpan={9} className="border border-slate-200 p-6 text-center text-slate-500">कोई कर्मचारी नहीं मिला।</td></tr>}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-xl font-extrabold">Create Monthly Payroll</h3>
                <p className="mt-1 text-sm text-slate-500">Net Salary = Basic Salary + Allowance − Deduction. एक कर्मचारी की एक महीने में एक Payroll Entry बनेगी।</p>
                <form onSubmit={savePayroll} className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <label className="text-sm font-bold">Employee
                    <select required value={payrollForm.staff_id} onChange={(e)=>{const selected=staffList.find(s=>String(s.id)===e.target.value);setPayrollForm({...payrollForm,staff_id:e.target.value,basic_salary:selected?String(selected.monthly_salary):payrollForm.basic_salary});}} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-normal">
                      <option value="">कर्मचारी चुनें</option>{staffList.filter(s=>s.is_active).map(s=><option key={s.id} value={s.id}>{s.full_name} — {s.institute}</option>)}
                    </select>
                  </label>
                  <label className="text-sm font-bold">Payroll Month
                    <input required type="month" value={payrollForm.payroll_month} onChange={(e)=>setPayrollForm({...payrollForm,payroll_month:e.target.value})} className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal"/>
                  </label>
                  <label className="text-sm font-bold">Basic Salary (₹)
                    <input required type="number" min="0" step="0.01" value={payrollForm.basic_salary} onChange={(e)=>setPayrollForm({...payrollForm,basic_salary:e.target.value})} className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal"/>
                  </label>
                  <label className="text-sm font-bold">Allowance (₹)
                    <input type="number" min="0" step="0.01" value={payrollForm.allowance} onChange={(e)=>setPayrollForm({...payrollForm,allowance:e.target.value})} className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal"/>
                  </label>
                  <label className="text-sm font-bold">Deduction (₹)
                    <input type="number" min="0" step="0.01" value={payrollForm.deduction} onChange={(e)=>setPayrollForm({...payrollForm,deduction:e.target.value})} className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal"/>
                  </label>
                  <label className="text-sm font-bold">Paid Amount (₹)
                    <input type="number" min="0" step="0.01" value={payrollForm.paid_amount} onChange={(e)=>setPayrollForm({...payrollForm,paid_amount:e.target.value})} className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal"/>
                  </label>
                  <label className="text-sm font-bold">Payment Date
                    <input type="date" value={payrollForm.payment_date} onChange={(e)=>setPayrollForm({...payrollForm,payment_date:e.target.value})} className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal"/>
                  </label>
                  <label className="text-sm font-bold">Payment Mode
                    <select value={payrollForm.payment_mode} onChange={(e)=>setPayrollForm({...payrollForm,payment_mode:e.target.value})} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-normal"><option>Cash</option><option>Bank Transfer</option><option>UPI</option><option>Cheque</option></select>
                  </label>
                  <label className="text-sm font-bold">Reference / Transaction No.
                    <input maxLength={100} value={payrollForm.payment_reference} onChange={(e)=>setPayrollForm({...payrollForm,payment_reference:e.target.value})} className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal"/>
                  </label>
                  <div className="sm:col-span-2 xl:col-span-3 rounded-xl bg-blue-50 p-4 text-sm">
                    <strong>Calculated Net Salary:</strong> {money(Math.max(0, Number(payrollForm.basic_salary||0)+Number(payrollForm.allowance||0)-Number(payrollForm.deduction||0)))}
                  </div>
                  <div className="sm:col-span-2 xl:col-span-3"><button disabled={payrollSaving} type="submit" className="rounded-lg bg-blue-800 px-6 py-3 font-bold text-white disabled:opacity-50">{payrollSaving ? "Saving..." : "Save Monthly Payroll"}</button></div>
                </form>
                {payrollMessage && <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm font-semibold text-slate-700">{payrollMessage}</p>}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><h3 className="text-xl font-extrabold">Salary Register & Payment History</h3><p className="mt-1 text-sm text-slate-500">Net Salary, भुगतान, बकाया और Status</p></div>
                  <div className="flex flex-wrap gap-2">
                    <input type="month" value={payrollMonth} onChange={(e)=>setPayrollMonth(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2"/>
                    <select value={payrollInstituteFilter} onChange={(e)=>setPayrollInstituteFilter(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="All">All Institutes</option>{institutes.map(i=><option key={i} value={i}>{i}</option>)}</select>
                    <button type="button" onClick={loadPayrollRecords} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold">Search</button>
                    <button type="button" onClick={exportPayrollCSV} disabled={payrollList.length===0} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Export CSV</button>
                  </div>
                </div>
                {payrollLoading ? <p className="mt-4 text-sm text-slate-500">Payroll लोड हो रहा है...</p> : (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[1100px] border-collapse text-sm">
                      <thead><tr className="bg-blue-50 text-left">{["Month","Staff","Institute","Basic","Allowance","Deduction","Net Salary","Paid","Balance","Status","Payment"].map(h=><th key={h} className="border border-slate-200 p-3">{h}</th>)}</tr></thead>
                      <tbody>
                        {payrollList.map((p)=><tr key={p.id} className="hover:bg-slate-50">
                          <td className="border border-slate-200 p-3">{p.payroll_month}</td><td className="border border-slate-200 p-3">{p.staff_name}<div className="text-xs text-slate-500">{p.staff_code} · {p.designation}</div></td><td className="border border-slate-200 p-3">{p.institute}</td><td className="border border-slate-200 p-3">{money(p.basic_salary)}</td><td className="border border-slate-200 p-3">{money(p.allowance)}</td><td className="border border-slate-200 p-3">{money(p.deduction)}</td><td className="border border-slate-200 p-3 font-bold">{money(p.net_salary)}</td><td className="border border-slate-200 p-3 text-emerald-700">{money(p.paid_amount)}</td><td className="border border-slate-200 p-3 text-amber-700">{money(p.balance)}</td><td className="border border-slate-200 p-3">{p.status}</td><td className="border border-slate-200 p-3"><button type="button" onClick={()=>recordPayrollPayment(p)} className="rounded-lg bg-blue-800 px-3 py-2 font-bold text-white">Record Payment</button></td>
                        </tr>)}
                        {payrollList.length===0 && <tr><td colSpan={11} className="border border-slate-200 p-6 text-center text-slate-500">इस फ़िल्टर के लिए Payroll रिकॉर्ड नहीं मिला।</td></tr>}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {active === "Fees & Receipts" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-xl font-extrabold">Collect Student Fees</h3>

                {loadingStudents && (
                  <p className="mt-4 text-sm text-slate-500">
                    विद्यार्थियों की सूची लोड हो रही है...
                  </p>
                )}

                <form onSubmit={collectFee} className="mt-5 space-y-4">
                  <label className="block text-sm font-bold">
                    संस्थान चुनें
                    <select
                      value={feeInstituteFilter}
                      onChange={(e) => {
                        setFeeInstituteFilter(e.target.value);
                        setSelectedId("");
                        setPaidAmount("");
                        setReceipt(null);
                        setReceiptStudent(null);
                        setFeeMessage("");
                      }}
                      className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-normal"
                    >
                      {institutes.map((institute) => (
                        <option key={institute} value={institute}>{institute}</option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-sm font-bold">
                    विद्यार्थी चुनें
                    <select
                      required
                      value={selectedId}
                      onChange={(e) => {
                        setSelectedId(e.target.value);
                        setReceipt(null);
                        setReceiptStudent(null);
                        setFeeMessage("");
                      }}
                      className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-normal"
                    >
                      <option value="">-- विद्यार्थी चुनें --</option>
                      {feeFilteredStudents.map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.admission_no} — {student.full_name}
                        </option>
                      ))}
                    </select>
                  </label>

                  {selectedStudent && (
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl bg-blue-50 p-4">
                        <p className="text-xs font-bold text-blue-800">Total Fee</p>
                        <p className="mt-2 text-xl font-black text-blue-950">
                          {money(totalFee)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-emerald-50 p-4">
                        <p className="text-xs font-bold text-emerald-800">Fee Paid</p>
                        <p className="mt-2 text-xl font-black text-emerald-950">
                          {money(feePaid)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-amber-50 p-4">
                        <p className="text-xs font-bold text-amber-800">Due Fee</p>
                        <p className="mt-2 text-xl font-black text-amber-950">
                          {money(dueFee)}
                        </p>
                      </div>
                    </div>
                  )}

                  <label className="block text-sm font-bold">
                    जमा राशि (₹)
                    <input
                      required
                      type="number"
                      min="0.01"
                      step="0.01"
                      max={dueFee}
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      placeholder="जैसे 5000"
                      disabled={!selectedStudent || dueFee <= 0}
                      className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal"
                    />
                  </label>

                  <label className="block text-sm font-bold">
                    Payment Mode
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-normal"
                    >
                      <option>Cash</option>
                      <option>UPI</option>
                      <option>Bank Transfer</option>
                      <option>Card</option>
                      <option>Cheque</option>
                    </select>
                  </label>

                  <button
                    type="submit"
                    disabled={collecting || !selectedStudent || dueFee <= 0}
                    className="rounded-lg bg-blue-800 px-6 py-3 font-bold text-white hover:bg-blue-950 disabled:opacity-50"
                  >
                    {collecting ? "Processing..." : "Collect Fee & Generate Receipt"}
                  </button>
                </form>

                {feeMessage && (
                  <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm font-semibold text-slate-700">
                    {feeMessage}
                  </p>
                )}

                {!loadingStudents && feeFilteredStudents.length === 0 && (
                  <p className="mt-4 text-sm text-slate-500">
                    इस संस्थान में कोई विद्यार्थी नहीं मिला। पहले Student Management में इस संस्थान का विद्यार्थी जोड़ें।
                  </p>
                )}
              </div>
            </div>
          )}

          {active === "Receipt History" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-extrabold">Receipt History</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      पुरानी रसीद देखें और दोबारा प्रिंट करें।
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => loadHistory()}
                    disabled={historyLoading}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold hover:bg-slate-50 disabled:opacity-50"
                  >
                    {historyLoading ? "Loading..." : "Refresh"}
                  </button>
                </div>

                <form
                  className="mt-5 flex flex-col gap-3 sm:flex-row"
                  onSubmit={(e) => {
                    e.preventDefault();
                    loadHistory(historySearch);
                  }}
                >
                  <input
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Receipt No., Admission No. या Student Name खोजें"
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 px-4 py-3"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-blue-800 px-6 py-3 font-bold text-white hover:bg-blue-950"
                  >
                    Search
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setHistorySearch("");
                      loadHistory("");
                    }}
                    className="rounded-lg border border-slate-300 px-5 py-3 font-bold hover:bg-slate-50"
                  >
                    Clear
                  </button>
                </form>

                {historyMessage && (
                  <p className="mt-4 text-sm text-slate-600">
                    {historyMessage}
                  </p>
                )}

                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[720px] border-collapse text-sm">
                    <thead>
                      <tr className="bg-blue-50 text-left">
                        <th className="border border-slate-200 p-3">Receipt No.</th>
                        <th className="border border-slate-200 p-3">Date</th>
                        <th className="border border-slate-200 p-3">Admission No.</th>
                        <th className="border border-slate-200 p-3">Student</th>
                        <th className="border border-slate-200 p-3">Paid</th>
                        <th className="border border-slate-200 p-3">Mode</th>
                        <th className="border border-slate-200 p-3">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((item) => (
                        <tr key={item.receipt_no} className="hover:bg-slate-50">
                          <td className="border border-slate-200 p-3 font-bold">
                            {item.receipt_no}
                          </td>
                          <td className="border border-slate-200 p-3">
                            {formatDate(item.payment_date)}
                          </td>
                          <td className="border border-slate-200 p-3">
                            {item.admission_no ?? "—"}
                          </td>
                          <td className="border border-slate-200 p-3">
                            {item.student_name ?? "—"}
                          </td>
                          <td className="border border-slate-200 p-3 font-bold">
                            {money(item.paid_amount)}
                          </td>
                          <td className="border border-slate-200 p-3">
                            {item.payment_mode}
                          </td>
                          <td className="border border-slate-200 p-3">
                            <button
                              type="button"
                              onClick={() => openOldReceipt(item.receipt_no)}
                              className="rounded-lg bg-blue-800 px-3 py-2 font-bold text-white hover:bg-blue-950"
                            >
                              View / Print
                            </button>
                          </td>
                        </tr>
                      ))}
                      {!historyLoading && history.length === 0 && (
                        <tr>
                          <td
                            colSpan={7}
                            className="border border-slate-200 p-6 text-center text-slate-500"
                          >
                            कोई रसीद उपलब्ध नहीं है।
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <p className="mt-4 text-xs leading-5 text-slate-500">
                  रसीद देखने या प्रिंट करने से कोई नया भुगतान नहीं बनता।
                </p>
              </div>

              {receipt && receiptStudent && (
                <div
                  id="fee-receipt"
                  className="rounded-2xl border border-slate-300 bg-white p-6 shadow-sm sm:p-9"
                >
                  <div className="border-b-2 border-blue-900 pb-5 text-center">
                    <p className="text-xs font-bold uppercase tracking-widest text-blue-800">
                      Official Fee Receipt
                    </p>
                    <h2 className="mt-2 text-2xl font-black text-[#102b52]">
                      {receipt.institute || receiptStudent.institute || "Rajiv Gandhi Polytechnic"}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Student Fee Payment Receipt
                    </p>
                  </div>

                  <div className="mt-5 flex flex-wrap justify-between gap-3 text-sm">
                    <p>
                      <strong>Receipt No:</strong> {receipt.receipt_no}
                    </p>
                    <p>
                      <strong>Date:</strong> {formatDate(receipt.payment_date)}
                    </p>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <p>
                      <strong>Admission No:</strong>{" "}
                      {receipt.admission_no ?? receiptStudent.admission_no}
                    </p>
                    <p>
                      <strong>Student Name:</strong>{" "}
                      {receipt.student_name ?? receiptStudent.full_name}
                    </p>
                    <p>
                      <strong>Father's Name:</strong>{" "}
                      {receipt.father_name ?? receiptStudent.father_name ?? "—"}
                    </p>
                    <p>
                      <strong>Course:</strong>{" "}
                      {receipt.course ?? receiptStudent.course}
                    </p>
                    <p>
                      <strong>Payment Mode:</strong> {receipt.payment_mode}
                    </p>
                  </div>

                  <table className="mt-6 w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-blue-50">
                        <th className="border border-slate-300 p-3 text-left">
                          Description
                        </th>
                        <th className="border border-slate-300 p-3 text-right">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-slate-300 p-3">Fees received</td>
                        <td className="border border-slate-300 p-3 text-right font-bold">
                          {money(receipt.paid_amount)}
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-slate-300 p-3">Total Course Fee</td>
                        <td className="border border-slate-300 p-3 text-right">
                          {money(receipt.total_fee)}
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-slate-300 p-3">
                          Paid up to this receipt
                        </td>
                        <td className="border border-slate-300 p-3 text-right">
                          {money(
                            Number(receipt.total_fee) -
                              Number(receipt.balance_due ?? 0)
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-slate-300 p-3 font-bold">
                          Balance Due after this receipt
                        </td>
                        <td className="border border-slate-300 p-3 text-right font-black">
                          {money(receipt.balance_due)}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <p className="mt-5 text-xs text-slate-500">
                    This receipt confirms receipt of the amount mentioned above.
                    Please retain it for your records.
                  </p>

                  <div className="mt-12 flex justify-between gap-6 text-center text-sm">
                    <div className="border-t border-slate-400 pt-2">
                      Student / Parent
                    </div>
                    <div className="border-t border-slate-400 pt-2">
                      Authorized Signatory
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={printReceipt}
                      className="rounded-lg bg-blue-800 px-6 py-3 font-bold text-white hover:bg-blue-950"
                    >
                      Print Receipt
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setReceipt(null);
                        setReceiptStudent(null);
                      }}
                      className="rounded-lg border border-slate-300 px-6 py-3 font-bold hover:bg-slate-50"
                    >
                      Close Receipt
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {active === "Fees Reports" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-xl font-extrabold">Daily & Monthly Fees Collection</h3>
                <p className="mt-1 text-sm text-slate-500">तारीख या महीने के अनुसार जमा फीस देखें और CSV/Excel में डाउनलोड करें।</p>

                <div className="mt-5 grid gap-4 sm:grid-cols-3 sm:items-end">
                  <label className="text-sm font-bold">
                    Report Type
                    <select value={reportPeriod} onChange={(e) => { setReportPeriod(e.target.value); setFeeReport(null); setReportMessage(""); }} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-normal">
                      <option value="daily">Daily Report</option>
                      <option value="monthly">Monthly Report</option>
                    </select>
                  </label>
                  {reportPeriod === "daily" ? (
                    <label className="text-sm font-bold">
                      Select Date
                      <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal" />
                    </label>
                  ) : (
                    <label className="text-sm font-bold">
                      Select Month
                      <input type="month" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal" />
                    </label>
                  )}
                  <button type="button" onClick={loadFeeReport} disabled={reportLoading} className="rounded-lg bg-blue-800 px-6 py-3 font-bold text-white hover:bg-blue-950 disabled:opacity-50">
                    {reportLoading ? "Loading..." : "View Report"}
                  </button>
                </div>

                {reportMessage && <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{reportMessage}</p>}
              </div>

              {feeReport && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-extrabold">{feeReport.period === "daily" ? "Daily Collection Report" : "Monthly Collection Report"}</h3>
                      <p className="mt-1 text-sm text-slate-500">{formatDate(feeReport.start_date)} — {formatDate(feeReport.end_date)}</p>
                    </div>
                    <button type="button" onClick={exportFeeReportCSV} className="rounded-lg bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800">Download Excel (CSV)</button>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl bg-blue-50 p-5">
                      <p className="text-sm font-bold text-blue-800">Total Fees Collected</p>
                      <p className="mt-2 text-2xl font-black text-blue-950">{money(feeReport.total_collection)}</p>
                    </div>
                    <div className="rounded-xl bg-emerald-50 p-5">
                      <p className="text-sm font-bold text-emerald-800">Number of Receipts</p>
                      <p className="mt-2 text-2xl font-black text-emerald-950">{feeReport.receipt_count}</p>
                    </div>
                  </div>

                  <div className="mt-5 overflow-x-auto">
                    <table className="w-full min-w-[760px] border-collapse text-sm">
                      <thead><tr className="bg-blue-50 text-left">
                        <th className="border border-slate-200 p-3">Receipt No.</th>
                        <th className="border border-slate-200 p-3">Date</th>
                        <th className="border border-slate-200 p-3">Admission No.</th>
                        <th className="border border-slate-200 p-3">Student Name</th>
                        <th className="border border-slate-200 p-3">Course</th>
                        <th className="border border-slate-200 p-3">Amount</th>
                        <th className="border border-slate-200 p-3">Mode</th>
                      </tr></thead>
                      <tbody>
                        {feeReport.records.map((record) => (
                          <tr key={record.receipt_no} className="hover:bg-slate-50">
                            <td className="border border-slate-200 p-3 font-bold">{record.receipt_no}</td>
                            <td className="border border-slate-200 p-3">{formatDate(record.payment_date)}</td>
                            <td className="border border-slate-200 p-3">{record.admission_no || "—"}</td>
                            <td className="border border-slate-200 p-3">{record.student_name || "—"}</td>
                            <td className="border border-slate-200 p-3">{record.course || "—"}</td>
                            <td className="border border-slate-200 p-3 font-bold">{money(record.paid_amount)}</td>
                            <td className="border border-slate-200 p-3">{record.payment_mode}</td>
                          </tr>
                        ))}
                        {feeReport.records.length === 0 && <tr><td colSpan={7} className="border border-slate-200 p-6 text-center text-slate-500">इस अवधि में कोई भुगतान रिकॉर्ड नहीं है।</td></tr>}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">डाउनलोड बटन CSV फ़ाइल बनाता है, जिसे Microsoft Excel में खोला जा सकता है।</p>
                </div>
              )}
            </div>
          )}

          {active === "Expense Management" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-xl font-extrabold">Add College Expense</h3>
                <p className="mt-1 text-xs text-slate-500">हर खर्च के साथ संस्थान चुनें; Salary Payroll का भुगतान भी रिपोर्ट में अलग से शामिल होगा।</p>
                <p className="mt-1 text-sm text-slate-500">कॉलेज के खर्च दर्ज करें। रिकॉर्ड PostgreSQL में सेव होगा।</p>
                <form onSubmit={saveExpense} className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-bold">Expense Date<input required type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal" /></label>
                  <label className="text-sm font-bold">Institute<select value={expenseInstitute} onChange={(e) => setExpenseInstitute(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-normal"><option>Rajiv Gandhi Polytechnic</option><option>Rajiv Gandhi ITI</option><option>Gramodyog Sewa Sansthan</option></select></label>
                  <label className="text-sm font-bold">Category<select value={expenseCategory} onChange={(e) => setExpenseCategory(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-normal"><option>Electricity Bill</option><option>Staff Salary</option><option>Stationery</option><option>Repair & Maintenance</option><option>Rent</option><option>Internet & Telephone</option><option>Travel</option><option>Other</option></select></label>
                  <label className="text-sm font-bold sm:col-span-2">Expense Details<input required maxLength={1000} value={expenseDescription} onChange={(e) => setExpenseDescription(e.target.value)} placeholder="जैसे अक्टूबर महीने का बिजली बिल" className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal" /></label>
                  <label className="text-sm font-bold">Amount (₹)<input required type="number" min="0.01" step="0.01" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} placeholder="जैसे 2500" className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal" /></label>
                  <label className="text-sm font-bold">Payment Mode<select value={expensePaymentMode} onChange={(e) => setExpensePaymentMode(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-normal"><option>Cash</option><option>UPI</option><option>Bank Transfer</option><option>Card</option><option>Cheque</option></select></label>
                  <label className="text-sm font-bold sm:col-span-2">Reference / Bill No. (optional)<input value={expenseReference} onChange={(e) => setExpenseReference(e.target.value)} placeholder="बिल नंबर या भुगतान संदर्भ" className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal" /></label>
                  <div className="sm:col-span-2"><button type="submit" disabled={expenseSaving} className="rounded-lg bg-blue-800 px-6 py-3 font-bold text-white hover:bg-blue-950 disabled:opacity-50">{expenseSaving ? "Saving..." : "Save Expense"}</button></div>
                </form>
                {expenseMessage && <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm font-semibold text-slate-700">{expenseMessage}</p>}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-xl font-extrabold">Daily & Monthly Income / Expense Report</h3>
                <div className="mt-5 grid gap-4 sm:grid-cols-3 sm:items-end">
                  <label className="text-sm font-bold">Report Type<select value={expensePeriod} onChange={(e) => { setExpensePeriod(e.target.value); setExpenseReport(null); }} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-normal"><option value="daily">Daily Report</option><option value="monthly">Monthly Report</option></select></label>
                  {expensePeriod === "daily" ? <label className="text-sm font-bold">Select Date<input type="date" value={expenseReportDate} onChange={(e) => setExpenseReportDate(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal" /></label> : <label className="text-sm font-bold">Select Month<input type="month" value={expenseReportMonth} onChange={(e) => setExpenseReportMonth(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal" /></label>}
                  <select value={expenseReportInstitute} onChange={(e) => setExpenseReportInstitute(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="All">All Institutes</option><option>Rajiv Gandhi Polytechnic</option><option>Rajiv Gandhi ITI</option><option>Gramodyog Sewa Sansthan</option></select>
                    <button type="button" onClick={loadExpenseReport} disabled={expenseReportLoading} className="rounded-lg bg-blue-800 px-6 py-3 font-bold text-white hover:bg-blue-950 disabled:opacity-50">{expenseReportLoading ? "Loading..." : "View Report"}</button>
                </div>
                {expenseReport && <>
                  <div className="mt-5 grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl bg-blue-50 p-5"><p className="text-sm font-bold text-blue-800">Fee Income</p><p className="mt-2 text-2xl font-black text-blue-950">{money(expenseReport.total_income)}</p></div>
                    <div className="rounded-xl bg-rose-50 p-5"><p className="text-sm font-bold text-rose-800">Total Expenses</p><p className="mt-2 text-2xl font-black text-rose-950">{money(expenseReport.combined_expense ?? expenseReport.total_expense)}</p></div>
                    <div className="rounded-xl bg-emerald-50 p-5"><p className="text-sm font-bold text-emerald-800">Net Balance</p><p className="mt-2 text-2xl font-black text-emerald-950">{money(expenseReport.net_balance)}</p></div>
                  </div>
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-500">{formatDate(expenseReport.start_date)} — {formatDate(expenseReport.end_date)} · {expenseReport.expense_count} expense entries</p><button type="button" onClick={exportExpenseCSV} className="rounded-lg bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800">Download Excel (CSV)</button></div>
                  <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[720px] border-collapse text-sm"><thead><tr className="bg-blue-50 text-left"><th className="border border-slate-200 p-3">Date</th><th className="border border-slate-200 p-3">Category</th><th className="border border-slate-200 p-3">Details</th><th className="border border-slate-200 p-3">Amount</th><th className="border border-slate-200 p-3">Mode</th><th className="border border-slate-200 p-3">Reference</th></tr></thead><tbody>{expenseReport.records.map((r) => <tr key={r.id} className="hover:bg-slate-50"><td className="border border-slate-200 p-3">{formatDate(r.expense_date)}</td><td className="border border-slate-200 p-3">{r.category}</td><td className="border border-slate-200 p-3">{r.description}</td><td className="border border-slate-200 p-3 font-bold">{money(r.amount)}</td><td className="border border-slate-200 p-3">{r.payment_mode}</td><td className="border border-slate-200 p-3">{r.reference_no || "—"}</td></tr>)}{expenseReport.records.length === 0 && <tr><td colSpan={6} className="border border-slate-200 p-6 text-center text-slate-500">इस अवधि में कोई खर्च रिकॉर्ड नहीं है।</td></tr>}</tbody></table></div>
                  <p className="mt-3 text-xs text-slate-500">Net Balance = चुनी हुई अवधि की फीस आय − दर्ज किए गए खर्च।</p>
                </>}
              </div>
            </div>
          )}

          {active === "Website" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-extrabold">Public Website</h3>
              <p className="mt-3 leading-7 text-slate-600">
                Open the public homepage to review your current design.
              </p>
              <a
                href="/"
                className="mt-5 inline-block rounded-lg bg-blue-800 px-5 py-3 font-bold text-white"
              >
                Open Homepage →
              </a>
            </div>
          )}
        </section>
      </div>

      <footer className="no-print px-5 py-6 text-center text-xs text-slate-500">
        Rajiv Gandhi Polytechnic · Admin Dashboard
      </footer>
    </main>
  );
}
