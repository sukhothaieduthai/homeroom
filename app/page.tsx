"use client";

import { useState } from "react";
import HomeroomForm from "@/components/HomeroomForm";
import ReportView from "@/components/ReportView";
import FullReport from "@/components/FullReport";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"record" | "report" | "full-report">("record");

  return (
    <main className="min-h-screen bg-blue-50 py-8 px-4 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header Card */}
        <div className="bg-white rounded-xl shadow-sm p-6 text-center border-t-4 border-blue-400">
          <h1 className="text-2xl font-bold text-blue-700">แบบบันทึกกิจกรรมโฮมรูม</h1>
          <p className="text-blue-600 font-medium">วิทยาลัยอาชีวศึกษาสุโขทัย</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-4 justify-center md:justify-start flex-wrap">
          <button
            onClick={() => setActiveTab("record")}
            className={`px-6 py-2 rounded-md font-bold transition-all ${activeTab === "record"
              ? "bg-blue-700 text-white shadow-md"
              : "bg-blue-100 text-blue-700 hover:bg-blue-200"
              }`}
          >
            บันทึกกิจกรรมโฮมรูม
          </button>
          <button
            onClick={() => setActiveTab("report")}
            className={`px-6 py-2 rounded-md font-bold transition-all ${activeTab === "report"
              ? "bg-green-600 text-white shadow-md"
              : "bg-green-100 text-green-700 hover:bg-green-200"
              }`}
          >
            รายงานสรุปผล
          </button>
          <button
            onClick={() => setActiveTab("full-report")}
            className={`px-6 py-2 rounded-md font-bold transition-all ${activeTab === "full-report"
              ? "bg-purple-600 text-white shadow-md"
              : "bg-purple-100 text-purple-700 hover:bg-purple-200"
              }`}
          >
            ระบบพิมพ์รายงาน
          </button>
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
          {activeTab === "record" && <HomeroomForm />}
          {activeTab === "report" && <ReportView />}
          {activeTab === "full-report" && <FullReport />}
        </div>

        <footer className="text-center text-sm text-gray-400 mt-8">
          © 2026 HomeRoom System - Sukhothai Vocational College
        </footer>
      </div>
    </main>
  );
}
