"use client";

import { useState, useEffect } from "react";
import { Advisor } from "@/lib/google-sheets";
import { 
    getAdvisorsAction, 
    addAdvisorAction, 
    deleteAdvisorAction, 
    updateAdvisorAction 
} from "@/app/actions";
import { Trash2Icon, PlusIcon, UserPlus, Users, PencilIcon, XIcon, SaveIcon } from "lucide-react";

const DEPARTMENTS = [
    "การบัญชี",
    "การตลาด",
    "โลจิสติกส์",
    "การจัดการสำนักงาน",
    "เทคโนโลยีธุรกิจดิจิทัล",
    "การท่องเที่ยว",
    "แฟชั่นและสิ่งทอ",
    "อาหารและโภชนาการ",
    "คหกรรมศาสตร์",
    "วิจิตรศิลป์",
    "ดิจิทัลกราฟิก",
    "การโรงแรม"
];

export default function AdvisorManagement() {
    const [advisors, setAdvisors] = useState<Advisor[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [editId, setEditId] = useState<string | null>(null); 

    const [formData, setFormData] = useState({
        name: "",
        department: "",
        classLevel: "ปวช. 1",
        room: "",
    });

    const fetchAdvisors = async () => {
        setIsLoading(true);
        const data = await getAdvisorsAction();
        setAdvisors(data);
        setIsLoading(false);
    };

    useEffect(() => {
        fetchAdvisors();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const startEdit = (advisor: Advisor) => {
        setEditId(advisor.id); 
        setFormData({
            name: advisor.name,
            department: advisor.department,
            classLevel: advisor.classLevel,
            room: advisor.room,
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelEdit = () => {
        setEditId(null);
        setFormData({ name: "", department: "", classLevel: "ปวช. 1", room: "" }); 
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.room || !formData.department) {
            alert("กรุณากรอกข้อมูลให้ครบถ้วน");
            return;
        }

        setIsSubmitting(true);

        let result;
        if (editId) {
            result = await updateAdvisorAction(editId, {
                ...formData
            });
        } else {
            result = await addAdvisorAction({
                ...formData
            });
        }

        if (result.success) {
            alert(editId ? "แก้ไขข้อมูลสำเร็จ" : "เพิ่มข้อมูลสำเร็จ");
            cancelEdit();
            fetchAdvisors(); 
        } else {
            alert("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
        }
        setIsSubmitting(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("ยืนยันการลบข้อมูลครูที่ปรึกษาท่านนี้?")) return;

        const result = await deleteAdvisorAction(id);
        if (result.success) {
            if (editId === id) {
                cancelEdit();
            }
            fetchAdvisors();
        } else {
            alert("ลบข้อมูลไม่สำเร็จ");
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b pb-4">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Users className="text-orange-500" />
                    จัดการข้อมูลครูที่ปรึกษา
                </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <div className={`p-6 rounded-lg border h-fit transition-colors shadow-sm ${editId ? 'bg-yellow-50 border-yellow-300' : 'bg-orange-50 border-orange-200'}`}>
                        <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${editId ? 'text-yellow-800' : 'text-orange-800'}`}>
                            {editId ? <PencilIcon size={20} /> : <UserPlus size={20} />}
                            {editId ? "แก้ไขข้อมูลครูที่ปรึกษา" : "เพิ่มครูที่ปรึกษาใหม่"}
                        </h3>
                        
                        <form onSubmit={handleSubmit} className="space-y-4 text-gray-700">
                            <div>
                                <label className="text-sm font-medium block mb-1">ชื่อ-นามสกุล</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    disabled={!!editId} 
                                    className={`w-full border rounded-md p-2 outline-none focus:ring-2 focus:ring-orange-400 ${editId ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white'}`}
                                    placeholder="เช่น นายสมชาย ใจดี"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium block mb-1">สาขาวิชา</label>
                                <select
                                    name="department"
                                    value={formData.department}
                                    onChange={handleInputChange}
                                    disabled={!!editId}
                                    className={`w-full border rounded-md p-2 outline-none focus:ring-2 focus:ring-orange-400 ${editId ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white'}`}
                                >
                                    <option value="">--- กรุณาเลือกสาขาวิชา ---</option>
                                    {DEPARTMENTS.map((dept) => (
                                        <option key={dept} value={dept}>{dept}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium block mb-1">ระดับชั้น</label>
                                    <select
                                        name="classLevel"
                                        value={formData.classLevel}
                                        onChange={handleInputChange}
                                        className="w-full border rounded-md p-2 outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                                    >
                                        {['ปวช.1', 'ปวช.2', 'ปวช.3', 'ปวส.1', 'ปวส.2', 'ปวส.2 ทวิ'].map(l => (
                                            <option key={l} value={l}>{l}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium block mb-1">ห้อง</label>
                                    <input
                                        type="text"
                                        name="room"
                                        value={formData.room}
                                        onChange={handleInputChange}
                                        className="w-full border rounded-md p-2 outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                                        placeholder="เช่น 1, 1/1"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2 mt-4 font-medium">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className={`flex-1 py-2 rounded-md transition-colors flex items-center justify-center gap-2 shadow-sm ${
                                        editId 
                                        ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
                                        : 'bg-orange-500 hover:bg-orange-600 text-white'
                                    } ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    {isSubmitting ? 'กำลังบันทึก...' : (editId ? <><SaveIcon size={18}/> แก้ไขข้อมูล</> : <><PlusIcon size={18}/> เพิ่มข้อมูล</>)}
                                </button>
                                
                                <button
                                    type="button"
                                    onClick={cancelEdit}
                                    disabled={isSubmitting}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors shadow-sm"
                                    title="ล้างฟอร์ม / ยกเลิก"
                                >
                                    <XIcon size={18} />
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                <div className="lg:col-span-2">
                    <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
                        <div className="bg-gray-100 px-4 py-3 border-b font-semibold text-gray-700 flex justify-between items-center">
                            <span>รายชื่อครูที่ปรึกษา</span>
                            <span className="text-sm bg-gray-200 px-2 py-1 rounded-full">{advisors.length} ท่าน</span>
                        </div>
                        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-600 sticky top-0 shadow-sm z-10">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">ชื่อ-สกุล</th>
                                        <th className="px-4 py-3 font-medium">สาขาวิชา</th>
                                        <th className="px-4 py-3 font-medium text-center">ชั้น</th>
                                        <th className="px-4 py-3 font-medium text-center">ห้อง</th>
                                        <th className="px-4 py-3 font-medium text-center w-28">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {isLoading ? (
                                        <tr><td colSpan={5} className="p-8 text-center text-gray-500">กำลังโหลด...</td></tr>
                                    ) : advisors.length === 0 ? (
                                        <tr><td colSpan={5} className="p-8 text-center text-gray-500">ไม่พบข้อมูล</td></tr>
                                    ) : (
                                        advisors.map((advisor) => (
                                            <tr key={advisor.id} className={`transition-colors ${editId === advisor.id ? 'bg-yellow-100' : 'hover:bg-gray-50'}`}>
                                                <td className="px-4 py-3 font-medium text-gray-900">{advisor.name}</td>
                                                <td className="px-4 py-3 text-gray-600">{advisor.department}</td>
                                                <td className="px-4 py-3 text-center text-gray-600">{advisor.classLevel}</td>
                                                <td className="px-4 py-3 text-center text-gray-600">{advisor.room}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex justify-center gap-2">
                                                        <button
                                                            onClick={() => startEdit(advisor)}
                                                            disabled={isSubmitting}
                                                            className="text-yellow-600 hover:text-yellow-800 p-2 rounded-md hover:bg-yellow-200 transition-colors disabled:opacity-50"
                                                            title="แก้ไขข้อมูล"
                                                        >
                                                            <PencilIcon size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(advisor.id)}
                                                            disabled={isSubmitting}
                                                            className="text-red-500 hover:text-red-700 p-2 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50"
                                                            title="ลบข้อมูล"
                                                        >
                                                            <Trash2Icon size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}