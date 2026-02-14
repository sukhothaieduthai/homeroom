"use client";

import { useState, useEffect } from "react";
import AdvisorSelector from "./AdvisorSelector";
import { Advisor, HomeroomReport } from "@/lib/google-sheets";
import { saveReportAction, uploadPhotosAction, getReportsAction } from "@/app/actions";
import { CalendarIcon, UploadCloudIcon, XIcon, ImageIcon } from "lucide-react";
import Image from "next/image";

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
    useEffect(() => {
        async function fetchReports() {
            const data = await getReportsAction();
            setAllReports(data);
        }
        fetchReports();
    }, []);

    // Filter reports when advisor, term, or year changes
    useEffect(() => {
        if (!selectedAdvisor) {
            setHistoryReports([]);
            return;
        }

        const filtered = allReports.filter(r =>
            (r.academicYear === academicYear || !r.academicYear) &&
            (r.term === term || !r.term) &&
            r.advisorName?.includes(selectedAdvisor.name)
        );

        // Sort by week number (ascending)
        const sorted = filtered.sort((a, b) => {
            const weekA = parseInt(String(a.week || "0"));
            const weekB = parseInt(String(b.week || "0"));
            return weekA - weekB;
        });

        setHistoryReports(sorted);
    }, [allReports, term, academicYear, selectedAdvisor]);

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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);

        if (files.length + selectedFiles.length > 3) {
            alert("อัปโหลดได้สูงสุด 3 รูปภาพ");
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
            alert("กรุณาเลือกครูที่ปรึกษา");
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Upload Photos
            let photoUrls: string[] = [];
            if (selectedFiles.length > 0) {
                const formDataUpload = new FormData();
                selectedFiles.forEach((file) => {
                    formDataUpload.append("files", file);
                });

                // Add metadata for custom filename generation
                formDataUpload.append("advisorName", selectedAdvisor.name);
                formDataUpload.append("term", term);
                formDataUpload.append("date", formData.date);
                formDataUpload.append("topic", formData.topic);

                photoUrls = await uploadPhotosAction(formDataUpload);
            }

            // 2. Save Report  
            await saveReportAction({
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
            });

            alert("บันทึกข้อมูลและอัปโหลดรูปภาพเรียบร้อยแล้ว");

            // Reset form
            setFormData(prev => ({
                ...prev,
                topic: "",
                week: "1",
                totalStudents: "0",
                presentStudents: "0",
                absentStudents: "0"
            }));
            setSelectedFiles([]);
            setImagePreviews([]);
        } catch (error) {
            console.error("[Form] Error:", error);
            alert("เกิดข้อผิดพลาดในการบันทึก: " + (error instanceof Error ? error.message : "Unknown error"));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">

            <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700">ภาคเรียนที่</label>
                    <select
                        value={term}
                        onChange={(e) => setTerm(e.target.value)}
                        className="border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                    >
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                    </select>
                </div>
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700">ปีการศึกษา</label>
                    <select
                        value={academicYear}
                        onChange={(e) => setAcademicYear(e.target.value)}
                        className="border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                    >
                        {years.map((y) => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            <AdvisorSelector year={Number(academicYear)} onAdvisorSelect={handleAdvisorSelect} />

            <div className="grid grid-cols-1 gap-6">
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700">ระดับชั้น</label>
                    <input
                        type="text"
                        className="border border-gray-300 rounded-md p-2 bg-gray-100 text-gray-900"
                        value={selectedAdvisor?.classLevel || ""}
                        readOnly
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700">ห้อง</label>
                    <input
                        type="text"
                        className="border border-gray-300 rounded-md p-2 bg-gray-100 text-gray-900"
                        value={selectedAdvisor?.room || ""}
                        readOnly
                    />
                </div>
            </div>

            <hr className="border-gray-200" />

            <div className="space-y-4">
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700">สัปดาห์ที่</label>
                    <input
                        type="number"
                        name="week"
                        min="1"
                        value={formData.week}
                        onChange={handleChange}
                        className="border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                        required
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700">วันที่</label>
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
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700">เรื่องที่อบรม</label>
                    <textarea
                        name="topic"
                        value={formData.topic}
                        onChange={handleChange}
                        rows={4}
                        className="border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                        required
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-700">จำนวนทั้งหมด</label>
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
                        <label className="text-sm font-medium text-gray-700">จำนวนที่มา</label>
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
                        <label className="text-sm font-medium text-gray-700">จำนวนที่ขาด</label>
                        <input
                            type="number"
                            name="absentStudents"
                            value={formData.absentStudents}
                            className="border border-gray-300 rounded-md p-2 bg-gray-100 text-gray-900 font-medium"
                            readOnly
                        />
                    </div>
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
                                        accept="image/png, image/jpeg, image/jpg"
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
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md transition-colors disabled:bg-blue-300"
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
    );
}
