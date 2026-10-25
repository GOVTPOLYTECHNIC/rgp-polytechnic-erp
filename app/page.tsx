
"use client";

import { useState } from "react";

const courses = [
  {
    number: "01",
    name: "Civil Engineering",
    short: "CE",
    description:
      "भवन निर्माण, सड़क, सर्वेक्षण और आधुनिक इंफ्रास्ट्रक्चर की तकनीकी शिक्षा।",
    color: "from-orange-500 to-amber-400",
  },
  {
    number: "02",
    name: "Mechanical Engineering",
    short: "ME",
    description:
      "मशीन डिजाइन, मैन्युफैक्चरिंग और औद्योगिक तकनीक का व्यावहारिक ज्ञान।",
    color: "from-blue-600 to-cyan-400",
  },
  {
    number: "03",
    name: "Electrical Engineering",
    short: "EE",
    description:
      "इलेक्ट्रिकल सिस्टम, पावर टेक्नोलॉजी और आधुनिक उपकरणों की शिक्षा।",
    color: "from-violet-600 to-indigo-400",
  },
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    course: "Civil Engineering",
    qualification: "",
  });
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const message = [
      "Admission Enquiry - Rajiv Gandhi Polytechnic",
      `Name: ${form.name}`,
      `Mobile: ${form.phone}`,
      `Course: ${form.course}`,
      `Qualification: ${form.qualification}`,
    ].join("\n");

    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      "_blank"
    );

    setSubmitted(true);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-white text-slate-900">
      {/* Top information bar */}
      <div className="bg-[#071c3b] text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-5 py-2.5 text-xs sm:text-sm">
          <p>Gauriganj Road, Musafirkhana, Amethi, Uttar Pradesh</p>
          <p className="font-medium text-blue-200">
            Admissions & Course Enquiries
          </p>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <a href="#home" className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-900 to-blue-600 text-lg font-black text-white shadow-lg">
              RG
            </div>
            <div>
              <h2 className="text-base font-black leading-tight tracking-tight text-[#102b52] sm:text-xl">
                RAJIV GANDHI
              </h2>
              <p className="mt-1 text-[10px] font-bold tracking-[0.22em] text-blue-600 sm:text-xs">
                POLYTECHNIC
              </p>
            </div>
          </a>

          <button
            type="button"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle navigation menu"
          >
            {menuOpen ? "✕ Close" : "☰ Menu"}
          </button>

          <nav
            className={`${
              menuOpen ? "flex" : "hidden"
            } absolute left-0 top-full w-full flex-col gap-5 border-b bg-white p-5 text-sm font-semibold shadow-lg md:static md:flex md:w-auto md:flex-row md:items-center md:border-0 md:bg-transparent md:p-0 md:shadow-none`}
          >
            {[
              ["Home", "#home"],
              ["About Us", "#about"],
              ["Courses", "#courses"],
              ["Facilities", "#facilities"],
              ["Contact", "#contact"],
            ].map(([label, href]) => (
              <a
                key={label}
                href={href}
                onClick={() => setMenuOpen(false)}
                className="transition hover:text-blue-700"
              >
                {label}
              </a>
            ))}
            <a
              href="#admission"
              onClick={() => setMenuOpen(false)}
              className="rounded-lg bg-blue-800 px-5 py-3 text-center font-bold text-white shadow-md transition hover:bg-blue-950"
            >
              Admission Enquiry ↗
            </a>
          </nav>
        </div>
      </header>

      {/* Hero section */}
      <section
        id="home"
        className="relative isolate overflow-hidden bg-[#071c3b] text-white"
      >
        <div className="absolute -right-32 -top-20 -z-10 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 -z-10 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:py-20 md:grid-cols-2 md:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/30 bg-blue-300/10 px-4 py-2 text-xs font-semibold text-blue-100 sm:text-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Welcome to Rajiv Gandhi Polytechnic
            </div>

            <p className="mt-8 text-sm font-bold uppercase tracking-[0.25em] text-cyan-300">
              Learn Today. Lead Tomorrow.
            </p>

            <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Build Your Future
              <span className="mt-2 block bg-gradient-to-r from-cyan-300 to-blue-200 bg-clip-text text-transparent">
                With Technical Education
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">
              Explore engineering diploma programmes, develop practical
              skills and prepare for new opportunities in the world of
              technology.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="#admission"
                className="rounded-xl bg-white px-6 py-3.5 font-bold text-blue-950 shadow-xl transition hover:-translate-y-1 hover:bg-cyan-100"
              >
                Enquire for Admission →
              </a>
              <a
                href="#courses"
                className="rounded-xl border border-white/30 px-6 py-3.5 font-bold transition hover:bg-white/10"
              >
                Explore Courses
              </a>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-4 border-t border-white/15 pt-7">
              <div>
                <p className="text-2xl font-black">3 Years</p>
                <p className="mt-1 text-sm text-slate-400">
                  Diploma Duration
                </p>
              </div>
              <div>
                <p className="text-2xl font-black">6 Semesters</p>
                <p className="mt-1 text-sm text-slate-400">
                  Regular Programme
                </p>
              </div>
              <div>
                <p className="text-2xl font-black">3 Branches</p>
                <p className="mt-1 text-sm text-slate-400">
                  Engineering Courses
                </p>
              </div>
            </div>
          </div>

          {/* Hero visual */}
          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-blue-500/30 to-cyan-300/10 blur-xl" />

            <div className="relative overflow-hidden rounded-[2rem] border border-white/20 bg-gradient-to-br from-blue-800 via-blue-700 to-cyan-700 p-5 shadow-2xl sm:p-8">
              <div className="flex items-center justify-between">
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold">
                  ENGINEERING EDUCATION
                </span>
                <span className="text-2xl">✦</span>
              </div>

              <div className="relative mt-7 flex h-56 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-sky-300/20 to-blue-950/40 sm:h-72">
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute left-1/4 top-0 h-full w-px bg-white" />
                  <div className="absolute left-2/4 top-0 h-full w-px bg-white" />
                  <div className="absolute left-3/4 top-0 h-full w-px bg-white" />
                  <div className="absolute top-1/4 h-px w-full bg-white" />
                  <div className="absolute top-2/4 h-px w-full bg-white" />
                  <div className="absolute top-3/4 h-px w-full bg-white" />
                </div>

                <div className="relative text-center">
                  <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl border border-white/30 bg-white/10 text-5xl shadow-2xl backdrop-blur">
                    ⚙
                  </div>
                  <p className="mt-5 text-xl font-extrabold sm:text-2xl">
                    Learn • Innovate • Build
                  </p>
                  <p className="mt-2 text-sm text-blue-100">
                    Your Engineering Journey Starts Here
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3">
                {courses.map((course) => (
                  <div
                    key={course.short}
                    className="rounded-xl border border-white/15 bg-white/10 p-3 text-center"
                  >
                    <p className="text-xl font-black">{course.short}</p>
                    <p className="mt-1 text-[10px] leading-4 text-blue-100 sm:text-xs">
                      {course.name.split(" ")[0]}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-center text-xs text-blue-100/80">
                Replace this illustration with your actual campus photograph.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="px-5 py-20 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-700">
              About Our Institution
            </p>
            <h2 className="mt-4 text-3xl font-black leading-tight text-[#102b52] sm:text-4xl">
              Education That Builds Skills and Confidence
            </h2>
            <p className="mt-6 leading-8 text-slate-600">
              Rajiv Gandhi Polytechnic, Musafirkhana, Amethi, aims to
              provide students with a foundation in technical education.
              Explore our diploma courses and contact the institution
              for verified information about admissions and eligibility.
            </p>
            <a
              href="#contact"
              className="mt-7 inline-flex rounded-lg bg-blue-800 px-6 py-3 font-bold text-white hover:bg-blue-950"
            >
              Know More About Us →
            </a>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-blue-50 p-6">
              <span className="text-3xl">🎓</span>
              <h3 className="mt-4 font-extrabold">Technical Learning</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Explore core engineering disciplines.
              </p>
            </div>
            <div className="mt-8 rounded-2xl bg-cyan-50 p-6">
              <span className="text-3xl">🛠️</span>
              <h3 className="mt-4 font-extrabold">Practical Skills</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Learn concepts for technical careers.
              </p>
            </div>
            <div className="rounded-2xl bg-amber-50 p-6">
              <span className="text-3xl">📘</span>
              <h3 className="mt-4 font-extrabold">Career Focus</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Build knowledge for future opportunities.
              </p>
            </div>
            <div className="mt-8 rounded-2xl bg-violet-50 p-6">
              <span className="text-3xl">🤝</span>
              <h3 className="mt-4 font-extrabold">Student Support</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Contact us for course guidance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Courses */}
      <section id="courses" className="bg-slate-50 px-5 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-700">
              Explore Our Programmes
            </p>
            <h2 className="mt-4 text-3xl font-black text-[#102b52] sm:text-4xl">
              Engineering Diploma Courses
            </h2>
            <p className="mt-4 leading-7 text-slate-600">
              Discover the engineering branch that matches your interests.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {courses.map((course) => (
              <article
                key={course.number}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-2 hover:shadow-xl"
              >
                <div
                  className={`bg-gradient-to-br ${course.color} p-7 text-white`}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/30 bg-white/15 text-xl font-black">
                      {course.short}
                    </span>
                    <span className="text-4xl font-black text-white/30">
                      {course.number}
                    </span>
                  </div>
                  <p className="mt-8 text-sm font-semibold text-white/80">
                    DIPLOMA PROGRAMME
                  </p>
                  <h3 className="mt-2 text-2xl font-black">
                    {course.name}
                  </h3>
                </div>

                <div className="p-7">
                  <p className="leading-7 text-slate-600">
                    {course.description}
                  </p>
                  <p className="mt-5 text-sm font-semibold text-slate-500">
                    Duration: Confirm with the institution
                  </p>
                  <a
                    href="#admission"
                    className="mt-6 inline-flex font-bold text-blue-800 group-hover:text-blue-950"
                  >
                    Enquire About Course →
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Facilities */}
      <section id="facilities" className="px-5 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-700">
              Campus Experience
            </p>
            <h2 className="mt-4 text-3xl font-black text-[#102b52] sm:text-4xl">
              Learn Beyond the Classroom
            </h2>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["🔬", "Laboratories", "Practical technical learning."],
              ["📚", "Library", "Learning resources and study."],
              ["💻", "Computer Learning", "Digital and technical skills."],
              ["👨‍🏫", "Faculty Support", "Guidance for students."],
            ].map(([icon, title, description]) => (
              <div
                key={title}
                className="rounded-2xl border border-slate-200 p-6 transition hover:border-blue-300 hover:shadow-lg"
              >
                <span className="text-3xl">{icon}</span>
                <h3 className="mt-4 text-lg font-extrabold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {description}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-center text-xs text-slate-500">
            Facilities listed above should be verified and updated to reflect
            the facilities actually available at the institution.
          </p>
        </div>
      </section>

      {/* Admission enquiry */}
      <section id="admission" className="bg-blue-50 px-5 py-20 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-2 md:items-start">
          <div className="pt-3">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-700">
              Admission Enquiry
            </p>
            <h2 className="mt-4 text-3xl font-black leading-tight text-[#102b52] sm:text-4xl">
              Take the First Step Towards Your Future
            </h2>
            <p className="mt-5 leading-8 text-slate-600">
              Fill in your basic details to prepare an admission enquiry
              message. You can review the message in WhatsApp before
              sending it to the appropriate college contact.
            </p>
            <div className="mt-8 rounded-2xl border border-blue-100 bg-white p-5">
              <p className="font-bold text-blue-950">Please note</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                This is an enquiry form, not an official admission
                application. Your details are not saved in a college
                database by this demo.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xl sm:p-8"
          >
            <h3 className="text-2xl font-black text-[#102b52]">
              Student Enquiry Form
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Enter your details below.
            </p>

            <label className="mt-6 block text-sm font-bold">
              Student Name *
              <input
                required
                minLength={2}
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
                placeholder="Enter full name"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="mt-5 block text-sm font-bold">
              Mobile Number *
              <input
                required
                type="tel"
                inputMode="numeric"
                pattern="[0-9]{10}"
                title="Enter a 10-digit mobile number"
                value={form.phone}
                onChange={(e) =>
                  setForm({
                    ...form,
                    phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                  })
                }
                placeholder="10-digit mobile number"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="mt-5 block text-sm font-bold">
              Interested Course *
              <select
                required
                value={form.course}
                onChange={(e) =>
                  setForm({ ...form, course: e.target.value })
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              >
                {courses.map((course) => (
                  <option key={course.short} value={course.name}>
                    {course.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-5 block text-sm font-bold">
              Last Qualification *
              <select
                required
                value={form.qualification}
                onChange={(e) =>
                  setForm({ ...form, qualification: e.target.value })
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Select qualification</option>
                <option value="High School / 10th">High School / 10th</option>
                <option value="Intermediate / 12th">
                  Intermediate / 12th
                </option>
                <option value="ITI">ITI</option>
                <option value="Other">Other</option>
              </select>
            </label>

            <button
              type="submit"
              className="mt-7 w-full rounded-xl bg-green-600 px-5 py-4 font-extrabold text-white shadow-lg transition hover:bg-green-700"
            >
              Prepare WhatsApp Enquiry ↗
            </button>

            {submitted && (
              <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">
                WhatsApp should open in a new tab. Review your message
                and press Send there to submit your enquiry.
              </p>
            )}

            <p className="mt-4 text-xs leading-5 text-slate-500">
              By continuing, you choose to open WhatsApp with your
              enquiry details. The message is not sent automatically.
            </p>
          </form>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="bg-white px-5 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-7 sm:p-10">
            <div className="grid gap-8 md:grid-cols-2 md:items-center">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-700">
                  Get in Touch
                </p>
                <h2 className="mt-3 text-3xl font-black text-[#102b52]">
                  Contact Rajiv Gandhi Polytechnic
                </h2>
                <p className="mt-4 leading-7 text-slate-600">
                  For verified information about courses, eligibility,
                  fees and admissions, contact the institution.
                </p>
              </div>
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <p className="font-extrabold text-blue-950">
                  Campus Address
                </p>
                <p className="mt-2 leading-7 text-slate-600">
                  Gauriganj Road, Musafirkhana, Amethi,
                  Uttar Pradesh, India
                </p>
                <a
                  href="https://www.google.com/maps/search/?api=1&query=Rajiv+Gandhi+Polytechnic+Musafirkhana+Amethi"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex font-bold text-blue-800 hover:text-blue-950"
                >
                  Find Location on Map ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#071c3b] px-5 py-9 text-white">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-lg font-black">RAJIV GANDHI POLYTECHNIC</p>
            <p className="mt-2 text-sm text-blue-200">
              Musafirkhana, Amethi, Uttar Pradesh
            </p>
          </div>
          <a
            href="#home"
            className="text-sm font-semibold text-blue-200 hover:text-white"
          >
            Back to Top ↑
          </a>
        </div>
        <div className="mx-auto mt-7 max-w-7xl border-t border-white/10 pt-5 text-xs text-blue-200">
          © 2026 Rajiv Gandhi Polytechnic. All rights reserved.
        </div>
      </footer>
    </main>
  );
}
