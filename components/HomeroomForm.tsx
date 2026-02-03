"use client";

import { useState } from "react";
import AdvisorSelector from "./AdvisorSelector";
import { Advisor, sheetService } from "@/lib/google-sheets";
import { CalendarIcon, UploadCloudIcon } from "lucide-react";

export default function HomeroomForm() {
    const [advisor, setAdvisor] = useState<Advisor | null>(null);
    const [formData, setFormData] = useState({
        week: "",
        date: new Date().toISOString().split("T")[0],
        topic: "",
        totalStudents: "",
        presentStudents: "",
        absentStudents: "",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAdvisorSelect = (selected: Advisor | null) => {
        setAdvisor(selected);
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!advisor) {
            alert("กรุณาเลือกครูที่ปรึกษา");
            return;
        }

        setIsSubmitting(true);
        try {
            await sheetService.saveReport({
                week: Number(formData.week),
                date: formData.date,
                advisorName: advisor.name,
                department: advisor.department,
                classLevel: advisor.classLevel,
                room: advisor.room,
                topic: formData.topic,
                totalStudents: Number(formData.totalStudents),
                presentStudents: Number(formData.presentStudents),
                absentStudents: Number(formData.absentStudents),
            });
            alert("บันทึกข้อมูลเรียบร้อยแล้ว");
            // Reset form or redirect
        } catch (error) {
            console.error(error);
            alert("เกิดข้อผิดพลาดในการบันทึก");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">

            <AdvisorSelector year={2568} onAdvisorSelect={handleAdvisorSelect} />

            {/* Auto-filled Fields */}
            <div className="grid grid-cols-1 gap-6">
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700">ระดับชั้น</label>
                    <input
                        type="text"
                        className="border border-gray-300 rounded-md p-2 bg-gray-100 text-gray-600"
                        value={advisor?.classLevel || ""}
                        readOnly
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700">ห้อง</label>
                    <input
                        type="text"
                        className="border border-gray-300 rounded-md p-2 bg-gray-100 text-gray-600"
                        value={advisor?.room || ""}
                        readOnly
                    />
                </div>
            </div>

            <hr className="border-gray-200" />

            {/* Form Fields */}
            <div className="space-y-4">
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700">สัปดาห์ที่</label>
                    <input
                        type="number"
                        name="week"
                        value={formData.week}
                        onChange={handleChange}
                        className="border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
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
                            className="border border-gray-300 rounded-md p-2 w-full focus:ring-2 focus:ring-blue-500 outline-none"
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
                        className="border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        required
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Stats */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-700">จำนวนทั้งหมด</label>
                        <input type="number" name="totalStudents" value={formData.totalStudents} onChange={handleChange} className="border border-gray-300 rounded-md p-2 outline-none" required />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-700">จำนวนที่มา</label>
                        <input type="number" name="presentStudents" value={formData.presentStudents} onChange={handleChange} className="border border-gray-300 rounded-md p-2 outline-none" required />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-700">จำนวนที่ขาด</label>
                        <input type="number" name="absentStudents" value={formData.absentStudents} onChange={handleChange} className="border border-gray-300 rounded-md p-2 bg-gray-100" readOnly={false} placeholder="(คำนวณอัตโนมัติได้ถ้าต้องการ)" />
                    </div>
                </div>

                {/* File Upload Placeholder */}
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700">อัปโหลดรูปภาพกิจกรรม (1-3 ภาพ, JPG หรือ PNG)</label>
                    <div className="border border-dashed border-gray-300 rounded-md p-4 bg-gray-50 flex items-center justify-center gap-2 text-gray-500 cursor-not-allowed">
                        <UploadCloudIcon size={20} />
                        <span>Upload Feature Coming Soon</span>
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
