"use client";

import { useState, useEffect, useMemo } from "react";
import AdvisorSelector from "./AdvisorSelector";
import { Advisor, HomeroomReport } from "@/lib/google-sheets";
import { saveReportAction, uploadPhotosAction, getReportsAction } from "@/app/actions";
import {
    CalendarIcon,
    UploadCloudIcon,
    XIcon,
    ImageIcon,
    AlertCircle,
    CheckCircle2,
    UsersIcon,
    PlusIcon,
    Trash2Icon,
    ChevronDownIcon,
    ChevronUpIcon
} from "lucide-react";
import Image from "next/image";
import { getScheduleForWeek, formatThaiDate, getAvailableWeeks } from "@/lib/schedule-mapping";
import { StudentTrackingRow } from "@/types/tracking";

const compressImage = (file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.8): Promise<File> => {
    return new Promise((resolve) => {
        if (!file.type.startsWith('image/')) {
            return resolve(file);
        }
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new window.Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                let width = img.width;
                let height = img.height;
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return resolve(file);
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    if (blob) {
                        const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });
                        resolve(newFile);
                    } else {
                        resolve(file); // fallback
                    }
                }, 'image/jpeg', quality);
            };
            img.onerror = () => resolve(file); // fallback
        };
        reader.onerror = () => resolve(file); // fallback
    });
};

export default function HomeroomForm() {
    const currentYearAD = new Date().getFullYear();
    const currentYearBE = currentYearAD + 543;
    const years = [
        currentYearBE - 2,
        currentYearBE - 1,
        currentYearBE,
        currentYearBE + 1,
        currentYearBE + 2,
    ];

    const [term, setTerm] = useState("2");
    const [academicYear, setAcademicYear] = useState(String(currentYearBE));
    const [selectedAdvisor, setSelectedAdvisor] = useState<Advisor | null>(null);
    const [formData, setFormData] = useState({
        week: "1",
        date: new Date().toISOString().split("T")[0],
        topic: "",
        totalStudents: "0",
        presentStudents: "0",
        absentStudents: "0",
    });
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Student Tracking Subsystem State
    const [isTrackingExpanded, setIsTrackingExpanded] = useState(false);
    const [trackingRows, setTrackingRows] = useState<StudentTrackingRow[]>([]);
    const [trackingNotes, setTrackingNotes] = useState("");

    // Custom alert modal
    const [modal, setModal] = useState({ isOpen: false, title: '', message: '', isSuccess: false });
    const showAlert = (title: string, message: string, isSuccess = false) =>
        setModal({ isOpen: true, title, message, isSuccess });
    const closeModal = () => setModal(prev => ({ ...prev, isOpen: false }));

    // History State
    const [allReports, setAllReports] = useState<HomeroomReport[]>([]);
    const [historyReports, setHistoryReports] = useState<HomeroomReport[]>([]);

    const handleAdvisorSelect = (advisors: Advisor[]) => {
        if (advisors.length > 0) {
            setSelectedAdvisor(advisors[0]);
        } else {
            setSelectedAdvisor(null);
        }
    };

    // Fetch all reports on mount
    const fetchReports = async () => {
        const data = await getReportsAction();
        setAllReports(data);
    };

    useEffect(() => {
        fetchReports();
    }, []);

    // Filter reports when advisor, term, or year changes
    useEffect(() => {
        if (!selectedAdvisor) {
            setHistoryReports([]);
            return;
        }

        const filtered = allReports.filter(r =>
            (String(r.academicYear) === String(academicYear) || !r.academicYear) &&
            (String(r.term) === String(term) || !r.term) &&
            r.advisorName?.includes(selectedAdvisor.name) &&
            r.room === selectedAdvisor.room &&
            r.classLevel === selectedAdvisor.classLevel
        );

        // Sort by week number (ascending)
        const sorted = filtered.sort((a, b) => {
            const weekA = parseInt(String(a.week || "0"));
            const weekB = parseInt(String(b.week || "0"));
            return weekA - weekB;
        });

        setHistoryReports(sorted);
    }, [allReports, term, academicYear, selectedAdvisor]);

    // Dynamic unrecorded available weeks
    const availableWeeks = useMemo(() => {
        return getAvailableWeeks(allReports, {
            term,
            academicYear,
            classLevel: selectedAdvisor?.classLevel,
            room: selectedAdvisor?.room,
            department: selectedAdvisor?.department,
        });
    }, [allReports, term, academicYear, selectedAdvisor]);

    // Auto-align selected week and date when availableWeeks or semester changes
    useEffect(() => {
        if (availableWeeks.length > 0) {
            const currentWeekNum = parseInt(formData.week);
            const isCurrentAvailable = availableWeeks.some(w => w.week === currentWeekNum);
            const targetWeek = isCurrentAvailable
                ? availableWeeks.find(w => w.week === currentWeekNum)!
                : availableWeeks[0];

            setFormData(prev => ({
                ...prev,
                week: String(targetWeek.week),
                date: (term === "2" && academicYear === "2569") ? targetWeek.date : prev.date
            }));
        } else if (term === "2" && academicYear === "2569") {
            const sched = getScheduleForWeek(parseInt(formData.week));
            if (sched) {
                setFormData(prev => ({ ...prev, date: sched.date }));
            }
        }
    }, [availableWeeks, term, academicYear]);

    // Handle week dropdown change with instant date auto-fill for Semester 2/2569
    const handleWeekChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedWeekStr = e.target.value;
        const weekNum = parseInt(selectedWeekStr);
        const sched = getScheduleForWeek(weekNum);

        setFormData(prev => ({
            ...prev,
            week: selectedWeekStr,
            date: (term === "2" && academicYear === "2569" && sched) ? sched.date : prev.date
        }));
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        let newValue = value;

        if (name === "week" && value !== "") {
            const numValue = parseInt(value);
            if (!isNaN(numValue) && numValue < 1) {
                newValue = "1";
            }
        }

        if ((name === "totalStudents" || name === "presentStudents") && value !== "") {
            const numValue = parseInt(value);
            if (!isNaN(numValue) && numValue < 0) {
                newValue = "0";
            }
        }

        setFormData((prev) => {
            const updatedData = { ...prev, [name]: newValue };

            if (name === "totalStudents" || name === "presentStudents") {
                const total = parseInt(updatedData.totalStudents) || 0;
                const present = parseInt(updatedData.presentStudents) || 0;

                if (present > total) {
                    updatedData.presentStudents = String(total);
                }

                const finalTotal = parseInt(updatedData.totalStudents) || 0;
                const finalPresent = parseInt(updatedData.presentStudents) || 0;
                updatedData.absentStudents = String(finalTotal - finalPresent);
            }

            return updatedData;
        });
    };

    // Tracking Row Helpers
    const handleAddTrackingRow = () => {
        setTrackingRows(prev => [
            ...prev,
            {
                name: "",
                resign: false,
                pause: false,
                expelled: false,
                absent: false,
                call: false,
                visit: false,
            }
        ]);
        if (!isTrackingExpanded) setIsTrackingExpanded(true);
    };

    const handleRemoveTrackingRow = (index: number) => {
        setTrackingRows(prev => prev.filter((_, i) => i !== index));
    };

    const handleTrackingRowChange = (index: number, field: keyof StudentTrackingRow, value: any) => {
        setTrackingRows(prev => prev.map((row, i) => {
            if (i !== index) return row;
            return { ...row, [field]: value };
        }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);

        if (files.length + selectedFiles.length > 3) {
            showAlert("แจ้งเตือน", "อัปโหลดได้สูงสุด 3 รูปภาพ");
            return;
        }

        const newFiles = [...selectedFiles, ...files];
        setSelectedFiles(newFiles);

        // Generate previews
        const newPreviews = files.map(file => URL.createObjectURL(file));
        setImagePreviews(prev => [...prev, ...newPreviews]);
    };

    const removeFile = (index: number) => {
        const newFiles = [...selectedFiles];
        newFiles.splice(index, 1);
        setSelectedFiles(newFiles);

        const newPreviews = [...imagePreviews];
        URL.revokeObjectURL(newPreviews[index]); // Cleanup
        newPreviews.splice(index, 1);
        setImagePreviews(newPreviews);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedAdvisor) {
            showAlert("แจ้งเตือน", "กรุณาเลือกครูที่ปรึกษา");
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Upload Photos if any
            let photoUrls: string[] = [];
            if (selectedFiles.length > 0) {
                const formDataUpload = new FormData();
                for (let i = 0; i < selectedFiles.length; i++) {
                    const compressed = await compressImage(selectedFiles[i]);
                    formDataUpload.append("files", compressed);
                }

                formDataUpload.append("advisorName", selectedAdvisor.name);
                formDataUpload.append("term", term);
                formDataUpload.append("date", formData.date);
                formDataUpload.append("topic", formData.topic);

                const uploadResult = await uploadPhotosAction(formDataUpload);
                if (uploadResult.success) {
                    photoUrls = uploadResult.data;
                } else {
                    console.warn("[Upload] Warning:", uploadResult.error);
                }
            }

            // 2. Save Report with Student Tracking Data
            const validTrackingRows = trackingRows.filter(r => r.name.trim() !== "");

            const saveResult = await saveReportAction({
                term,
                academicYear,
                week: Number(formData.week),
                date: formData.date,
                advisorName: selectedAdvisor.name,
                department: selectedAdvisor.department,
                classLevel: selectedAdvisor.classLevel,
                room: selectedAdvisor.room,
                topic: formData.topic,
                totalStudents: Number(formData.totalStudents),
                presentStudents: Number(formData.presentStudents),
                absentStudents: Number(formData.absentStudents),
                photoUrl: photoUrls.join(","),
                studentTracking: validTrackingRows,
                studentTrackingNotes: trackingNotes,
            });

            if (!saveResult.success) {
                throw new Error(saveResult.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
            }

            showAlert("สำเร็จ", "บันทึกข้อมูลและอัปโหลดรูปภาพเรียบร้อยแล้ว", true);

            // Reset form
            setFormData(prev => ({
                ...prev,
                topic: "",
                totalStudents: "0",
                presentStudents: "0",
                absentStudents: "0"
            }));
            setSelectedFiles([]);
            setImagePreviews([]);
            setTrackingRows([]);
            setTrackingNotes("");

            // Re-fetch reports to update history and dynamic week filter instantly
            await fetchReports();
        } catch (error) {
            console.error("[Form] Error:", error);
            showAlert("ข้อผิดพลาด", "เกิดข้อผิดพลาดในการบันทึก: " + (error instanceof Error ? error.message : "Unknown error"));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <form onSubmit={handleSubmit} className="space-y-6">

                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-700">ภาคเรียนที่</label>
                        <select
                            value={term}
                            onChange={(e) => setTerm(e.target.value)}
                            className="border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white"
                        >
                            <option value="1">1</option>
                            <option value="2">2</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-700">ปีการศึกษา</label>
                        <select
                            value={academicYear}
                            onChange={(e) => setAcademicYear(e.target.value)}
                            className="border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white"
                        >
                            {years.map((y) => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <AdvisorSelector year={Number(academicYear)} onAdvisorSelect={handleAdvisorSelect} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-700">ระดับชั้น</label>
                        <input
                            type="text"
                            className="border border-gray-300 rounded-md p-2 bg-gray-100 text-gray-900 font-medium"
                            value={selectedAdvisor?.classLevel || ""}
                            readOnly
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-700">ห้อง</label>
                        <input
                            type="text"
                            className="border border-gray-300 rounded-md p-2 bg-gray-100 text-gray-900 font-medium"
                            value={selectedAdvisor?.room || ""}
                            readOnly
                        />
                    </div>
                </div>

                <hr className="border-gray-200" />

                <div className="space-y-4">
                    {/* Week selection with Dynamic Filtering */}
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-medium text-gray-700">สัปดาห์ที่</label>
                            {selectedAdvisor && availableWeeks.length === 0 && (
                                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-300">
                                    ✓ บันทึกครบทั้ง 18 สัปดาห์แล้ว
                                </span>
                            )}
                            {selectedAdvisor && availableWeeks.length > 0 && availableWeeks.length < 18 && (
                                <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                    เหลือ {availableWeeks.length} สัปดาห์ที่ยังไม่ได้บันทึก
                                </span>
                            )}
                        </div>

                        <select
                            name="week"
                            value={formData.week}
                            onChange={handleWeekChange}
                            className="border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white"
                            required
                        >
                            {availableWeeks.length > 0 ? (
                                availableWeeks.map(w => (
                                    <option key={w.week} value={w.week}>
                                        สัปดาห์ที่ {w.week} ({w.thaiDate}) {w.notes ? `- ${w.notes}` : ''}
                                    </option>
                                ))
                            ) : (
                                Array.from({ length: 18 }, (_, i) => i + 1).map(w => (
                                    <option key={w} value={w}>
                                        สัปดาห์ที่ {w} (บันทึกแล้ว)
                                    </option>
                                ))
                            )}
                        </select>
                    </div>

                    {/* Date with Auto-Fill Display */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-gray-700">วันที่จัดกิจกรรม</label>
                        <div className="relative">
                            <input
                                type="date"
                                name="date"
                                value={formData.date}
                                onChange={handleChange}
                                className="border border-gray-300 rounded-md p-2 w-full focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                                required
                            />
                        </div>
                        {term === "2" && academicYear === "2569" && (
                            <div className="text-xs text-blue-700 bg-blue-50 px-3 py-1.5 rounded-md flex items-center gap-1.5 border border-blue-200">
                                <CalendarIcon size={14} className="shrink-0 text-blue-500" />
                                <span>กำหนดการทางการ: <strong>{formatThaiDate(formData.date)}</strong></span>
                                {getScheduleForWeek(parseInt(formData.week))?.notes && (
                                    <span className="text-blue-600">({getScheduleForWeek(parseInt(formData.week))?.notes})</span>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-700">เรื่องที่อบรม / หัวข้อกิจกรรม</label>
                        <textarea
                            name="topic"
                            value={formData.topic}
                            onChange={handleChange}
                            rows={3}
                            placeholder="ระบุหัวข้อหรือกิจกรรมโฮมรูมประจำสัปดาห์..."
                            className="border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-gray-700">จำนวนทั้งหมด (คน)</label>
                            <input
                                type="number"
                                name="totalStudents"
                                min="0"
                                value={formData.totalStudents}
                                onChange={handleChange}
                                className="border border-gray-300 rounded-md p-2 outline-none text-gray-900"
                                required
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-gray-700">จำนวนที่มา (คน)</label>
                            <input
                                type="number"
                                name="presentStudents"
                                min="0"
                                value={formData.presentStudents}
                                onChange={handleChange}
                                className="border border-gray-300 rounded-md p-2 outline-none text-gray-900"
                                required
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-gray-700">จำนวนที่ขาด (คน)</label>
                            <input
                                type="number"
                                name="absentStudents"
                                value={formData.absentStudents}
                                className="border border-gray-300 rounded-md p-2 bg-gray-100 text-gray-900 font-semibold"
                                readOnly
                            />
                        </div>
                    </div>

                    {/* Expandable Dropout & Chronic Absenteeism Tracking Section */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm mt-2">
                        <button
                            type="button"
                            onClick={() => setIsTrackingExpanded(prev => !prev)}
                            className="w-full flex items-center justify-between p-3.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                        >
                            <div className="flex items-center gap-2.5">
                                <UsersIcon size={18} className="text-blue-600" />
                                <div>
                                    <span className="font-semibold text-gray-800 text-sm">
                                        การติดตามนักเรียน นักศึกษาที่ขาดเรียนบ่อย และนักเรียนที่ออกกลางคัน
                                    </span>
                                    {trackingRows.length > 0 && (
                                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800">
                                            {trackingRows.length} คน
                                        </span>
                                    )}
                                </div>
                            </div>
                            {isTrackingExpanded ? <ChevronUpIcon size={18} className="text-gray-500" /> : <ChevronDownIcon size={18} className="text-gray-500" />}
                        </button>

                        {isTrackingExpanded && (
                            <div className="p-4 space-y-4 border-t border-gray-200 bg-white">
                                <div className="flex justify-between items-center">
                                    <p className="text-xs text-gray-500">
                                        บันทึกข้อมูลนักเรียนที่มีความเสี่ยงออกกลางคัน เพื่อนำไปแสดงในรายงานติดตาม (แบบติดตามนักเรียน)
                                    </p>
                                    <button
                                        type="button"
                                        onClick={handleAddTrackingRow}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                                    >
                                        <PlusIcon size={14} /> เพิ่มรายชื่อนักเรียน
                                    </button>
                                </div>

                                {trackingRows.length === 0 ? (
                                    <div className="text-center py-5 border border-dashed border-gray-200 rounded-md bg-gray-50">
                                        <p className="text-xs text-gray-500">ยังไม่มีรายชื่อนักเรียนที่ต้องติดตามในสัปดาห์นี้</p>
                                        <button
                                            type="button"
                                            onClick={handleAddTrackingRow}
                                            className="mt-1.5 text-xs text-blue-600 font-semibold hover:underline"
                                        >
                                            + กดที่นี่เพื่อเพิ่มนักเรียน
                                        </button>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full border-collapse border border-gray-300 text-xs">
                                            <thead>
                                                <tr className="bg-gray-100">
                                                    <th className="border border-gray-300 p-2 text-center w-12" rowSpan={2}>ลำดับ</th>
                                                    <th className="border border-gray-300 p-2 text-left min-w-[180px]" rowSpan={2}>รายชื่อนักเรียน นักศึกษา</th>
                                                    <th className="border border-gray-300 p-2 text-center" colSpan={4}>สาเหตุออกกลางคัน</th>
                                                    <th className="border border-gray-300 p-2 text-center" colSpan={2}>การติดตาม</th>
                                                    <th className="border border-gray-300 p-2 text-center w-12" rowSpan={2}>ลบ</th>
                                                </tr>
                                                <tr className="bg-gray-50 text-[11px]">
                                                    <th className="border border-gray-300 p-1.5 text-center w-16">ลาออก</th>
                                                    <th className="border border-gray-300 p-1.5 text-center w-20">พักการเรียน</th>
                                                    <th className="border border-gray-300 p-1.5 text-center w-16">พ้นสภาพ</th>
                                                    <th className="border border-gray-300 p-1.5 text-center w-28">ไม่มาเรียน (มีรายชื่อ)</th>
                                                    <th className="border border-gray-300 p-1.5 text-center w-24">โทรศัพท์/Line</th>
                                                    <th className="border border-gray-300 p-1.5 text-center w-20">เยี่ยมบ้าน</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {trackingRows.map((row, idx) => (
                                                    <tr key={idx} className="hover:bg-gray-50">
                                                        <td className="border border-gray-300 p-2 text-center font-medium">{idx + 1}</td>
                                                        <td className="border border-gray-300 p-1.5">
                                                            <input
                                                                type="text"
                                                                value={row.name}
                                                                onChange={(e) => handleTrackingRowChange(idx, 'name', e.target.value)}
                                                                placeholder="ชื่อ-สกุล นักเรียน..."
                                                                className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                                                            />
                                                        </td>
                                                        <td className="border border-gray-300 p-1 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={row.resign}
                                                                onChange={(e) => handleTrackingRowChange(idx, 'resign', e.target.checked)}
                                                                className="rounded text-blue-600 focus:ring-blue-500"
                                                            />
                                                        </td>
                                                        <td className="border border-gray-300 p-1 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={row.pause}
                                                                onChange={(e) => handleTrackingRowChange(idx, 'pause', e.target.checked)}
                                                                className="rounded text-blue-600 focus:ring-blue-500"
                                                            />
                                                        </td>
                                                        <td className="border border-gray-300 p-1 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={row.expelled}
                                                                onChange={(e) => handleTrackingRowChange(idx, 'expelled', e.target.checked)}
                                                                className="rounded text-blue-600 focus:ring-blue-500"
                                                            />
                                                        </td>
                                                        <td className="border border-gray-300 p-1 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={row.absent}
                                                                onChange={(e) => handleTrackingRowChange(idx, 'absent', e.target.checked)}
                                                                className="rounded text-blue-600 focus:ring-blue-500"
                                                            />
                                                        </td>
                                                        <td className="border border-gray-300 p-1 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={row.call}
                                                                onChange={(e) => handleTrackingRowChange(idx, 'call', e.target.checked)}
                                                                className="rounded text-blue-600 focus:ring-blue-500"
                                                            />
                                                        </td>
                                                        <td className="border border-gray-300 p-1 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={row.visit}
                                                                onChange={(e) => handleTrackingRowChange(idx, 'visit', e.target.checked)}
                                                                className="rounded text-blue-600 focus:ring-blue-500"
                                                            />
                                                        </td>
                                                        <td className="border border-gray-300 p-1 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveTrackingRow(idx)}
                                                                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                                                                title="ลบแถว"
                                                            >
                                                                <Trash2Icon size={14} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                <div className="flex flex-col gap-1.5 pt-1">
                                    <label className="text-xs font-semibold text-gray-700">
                                        การติดตาม สาเหตุที่ทำให้นักเรียนนักศึกษาออกกลางคัน (หมายเหตุ/สรุปผล)
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={trackingNotes}
                                        onChange={(e) => setTrackingNotes(e.target.value)}
                                        placeholder="ระบุสาเหตุเพิ่มเติมและการติดตาม..."
                                        className="border border-gray-300 rounded-md p-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-700">อัปโหลดรูปภาพกิจกรรม (1-3 ภาพ)</label>
                        <div className="border border-dashed border-gray-300 rounded-md p-4 bg-gray-50 flex flex-col items-center justify-center gap-4">
                            <div className="flex gap-4 flex-wrap justify-center">
                                {imagePreviews.map((src, index) => (
                                    <div key={index} className="relative w-24 h-24 rounded-md overflow-hidden border">
                                        <Image src={src} alt="Preview" fill className="object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => removeFile(index)}
                                            className="absolute top-0 right-0 bg-red-500 text-white rounded-bl-md p-1 hover:bg-red-600"
                                        >
                                            <XIcon size={12} />
                                        </button>
                                    </div>
                                ))}
                                {imagePreviews.length < 3 && (
                                    <label className="w-24 h-24 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-md cursor-pointer hover:bg-gray-100 transition-colors">
                                        <UploadCloudIcon className="text-gray-400 mb-1" />
                                        <span className="text-xs text-gray-500">เลือกรูป</span>
                                        <input
                                            type="file"
                                            accept="image/*, image/heic, image/heif"
                                            multiple
                                            className="hidden"
                                            onChange={handleFileChange}
                                        />
                                    </label>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md transition-colors disabled:bg-blue-300 shadow-md"
                >
                    {isSubmitting ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                </button>

                {/* Report History Section */}
                {selectedAdvisor && (
                    <div className="mt-8 pt-6 border-t-2 border-gray-300">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">
                            ประวัติการบันทึก (Report History)
                        </h3>

                        {historyReports.length === 0 ? (
                            <div className="text-center text-gray-400 py-8 bg-gray-50 rounded-lg">
                                <p>ไม่พบรายการบันทึก สำหรับ {selectedAdvisor.name} ภาคเรียนที่ {term}/{academicYear}</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="bg-blue-50 p-3 rounded-lg mb-4">
                                    <p className="text-sm text-gray-700">
                                        <span className="font-semibold">{selectedAdvisor.name}</span> - {selectedAdvisor.department} ระดับชั้น {selectedAdvisor.classLevel} ห้อง {selectedAdvisor.room}
                                    </p>
                                    <p className="text-sm text-gray-600">ภาคเรียนที่ {term}/{academicYear} - พบ {historyReports.length} รายการ</p>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse border border-gray-300">
                                        <thead>
                                            <tr className="bg-gray-100">
                                                <th className="border border-gray-300 p-3 text-left text-sm font-semibold text-gray-700 w-24">สัปดาห์</th>
                                                <th className="border border-gray-300 p-3 text-left text-sm font-semibold text-gray-700 w-32">วันที่</th>
                                                <th className="border border-gray-300 p-3 text-left text-sm font-semibold text-gray-700">หัวข้อกิจกรรม</th>
                                                <th className="border border-gray-300 p-3 text-center text-sm font-semibold text-gray-700 w-20">จำนวน</th>
                                                <th className="border border-gray-300 p-3 text-center text-sm font-semibold text-gray-700 w-20">มา</th>
                                                <th className="border border-gray-300 p-3 text-center text-sm font-semibold text-gray-700 w-20">ขาด</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {historyReports.map((report, index) => (
                                                <tr key={report.id || index} className="hover:bg-gray-50 transition-colors">
                                                    <td className="border border-gray-300 p-3 text-sm text-gray-800">
                                                        สัปดาห์ {report.week}
                                                    </td>
                                                    <td className="border border-gray-300 p-3 text-sm text-gray-800">
                                                        {report.date}
                                                    </td>
                                                    <td className="border border-gray-300 p-3 text-sm text-gray-700">
                                                        {report.topic}
                                                    </td>
                                                    <td className="border border-gray-300 p-3 text-center text-sm text-gray-800">
                                                        {report.totalStudents}
                                                    </td>
                                                    <td className="border border-gray-300 p-3 text-center text-sm text-green-600 font-medium">
                                                        {report.presentStudents}
                                                    </td>
                                                    <td className="border border-gray-300 p-3 text-center text-sm text-red-600 font-medium">
                                                        {report.absentStudents}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </form>

            {/* Custom Alert Modal */}
            {modal.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all">
                        <div className={`p-4 border-b flex items-center gap-3 ${modal.isSuccess ? 'bg-green-50 text-green-800' : modal.title === 'ข้อผิดพลาด' ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-800'}`}>
                            {modal.isSuccess
                                ? <CheckCircle2 size={24} className="text-green-500" />
                                : <AlertCircle size={24} className={modal.title === 'ข้อผิดพลาด' ? 'text-red-500' : 'text-orange-500'} />}
                            <h3 className="font-bold text-lg">{modal.title}</h3>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-700">{modal.message}</p>
                        </div>
                        <div className="flex justify-end px-6 py-4 bg-gray-50 border-t">
                            <button
                                type="button"
                                onClick={closeModal}
                                className={`px-6 py-2 rounded-md text-white font-medium shadow-sm transition-colors ${modal.isSuccess ? 'bg-green-500 hover:bg-green-600'
                                    : modal.title === 'ข้อผิดพลาด' ? 'bg-red-500 hover:bg-red-600'
                                        : 'bg-orange-500 hover:bg-orange-600'
                                    }`}
                            >
                                ตกลง
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
