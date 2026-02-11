"use client";

import { useState } from "react";
import AdvisorSelector from "./AdvisorSelector";
import { Advisor } from "@/lib/google-sheets";
import { saveReportAction, uploadPhotosAction } from "@/app/actions";
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

    const handleAdvisorSelect = (advisors: Advisor[]) => {
        if (advisors.length > 0) {
            setSelectedAdvisor(advisors[0]);
        } else {
            setSelectedAdvisor(null);
        }
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
        </form>
    );
}
