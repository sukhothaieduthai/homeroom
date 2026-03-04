"use client";

import { useState, useEffect, useCallback } from "react";
import { HomeroomReport } from "@/lib/google-sheets";
import { getReportsAction, deleteReportsAction } from "@/app/actions";
import { DownloadIcon, Image as ImageIcon, Filter, Trash2Icon, AlertCircle, EyeIcon, EyeOffIcon } from "lucide-react";

export default function ReportView() {
    const [reports, setReports] = useState<HomeroomReport[]>([]);
    const [selectedTerm, setSelectedTerm] = useState<string>("all");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isDeleting, setIsDeleting] = useState(false);

    // --- PIN Modal state (same pattern as AdvisorManagement) ---
    type DialogType = 'alert' | 'confirm' | 'prompt' | null;
    const [dialog, setDialog] = useState({
        isOpen: false,
        type: null as DialogType,
        title: '',
        message: '',
        inputValue: '',
        onConfirm: (val?: string) => { },
    });

    const [showPin, setShowPin] = useState(false);
    const closeDialog = () => { setDialog(prev => ({ ...prev, isOpen: false })); setShowPin(false); };

    const showAlert = (title: string, message: string) => {
        setDialog({ isOpen: true, type: 'alert', title, message, inputValue: '', onConfirm: closeDialog });
    };

    const showPrompt = (title: string, message: string, onConfirm: (val: string) => void) => {
        setDialog({
            isOpen: true, type: 'prompt', title, message, inputValue: '',
            onConfirm: (val?: string) => { closeDialog(); if (val) onConfirm(val); },
        });
    };

    const fetchReports = useCallback(async () => {
        const data = await getReportsAction();
        data.sort((a, b) => {
            const dateComparison = new Date(b.date).getTime() - new Date(a.date).getTime();
            if (dateComparison === 0 && a.timestamp && b.timestamp) {
                return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
            }
            return dateComparison;
        });
        setReports(data);
    }, []);

    useEffect(() => { fetchReports(); }, [fetchReports]);

    const availableTerms = Array.from(new Set(reports.map(r => `${r.term}/${r.academicYear}`))).sort();

    const filteredReports = selectedTerm === "all"
        ? reports
        : reports.filter(r => `${r.term}/${r.academicYear}` === selectedTerm);

    // --- Selection logic ---
    const allFilteredIds = filteredReports.map(r => r.id);
    const allSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedIds.has(id));
    const someSelected = allFilteredIds.some(id => selectedIds.has(id));

    const toggleSelectAll = () => {
        if (allSelected) {
            const next = new Set(selectedIds);
            allFilteredIds.forEach(id => next.delete(id));
            setSelectedIds(next);
        } else {
            const next = new Set(selectedIds);
            allFilteredIds.forEach(id => next.add(id));
            setSelectedIds(next);
        }
    };

    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id); else next.add(id);
        setSelectedIds(next);
    };

    // --- Delete with PIN ---
    const handleDeleteSelected = () => {
        const count = Array.from(selectedIds).filter(id => allFilteredIds.includes(id)).length;
        if (count === 0) return;
        showPrompt(
            "ยืนยันการลบรายงาน",
            `กรุณาใส่รหัสผ่านเพื่อยืนยันการลบ ${count} รายการที่เลือก:`,
            async (pin) => {
                setIsDeleting(true);
                const idsToDelete = Array.from(selectedIds).filter(id => allFilteredIds.includes(id));
                const result = await deleteReportsAction(idsToDelete, pin);
                if (result.success) {
                    setSelectedIds(new Set());
                    await fetchReports();
                    showAlert("สำเร็จ", `ลบรายงาน ${count} รายการเรียบร้อยแล้ว`);
                } else {
                    showAlert("ข้อผิดพลาด", result.error || "เกิดข้อผิดพลาดในการลบ");
                }
                setIsDeleting(false);
            }
        );
    };

    // --- Export PDF ---
    const handleExportPDF = async () => {
        try {
            const payload = {
                mode: 'summary',
                data: {
                    term: selectedTerm === "all" ? "All" : selectedTerm.split('/')[0],
                    academicYear: selectedTerm === "all" ? "" : selectedTerm.split('/')[1],
                    reports: filteredReports,
                    photos: []
                }
            };
            const response = await fetch('/api/pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error("Failed to generate PDF");
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `homeroom-summary-${selectedTerm === "all" ? "all" : selectedTerm.replace('/', '-')}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error("Export failed", error);
            alert("เกิดข้อผิดพลาดในการสร้าง PDF");
        }
    };

    const selectedCount = Array.from(selectedIds).filter(id => allFilteredIds.includes(id)).length;

    return (
        <div className="space-y-6">
            {/* --- Top bar --- */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <h2 className="text-xl font-semibold text-gray-800 whitespace-nowrap">สรุปรายงาน</h2>

                    <div className="relative flex items-center">
                        <Filter className="absolute left-3 text-black" size={16} />
                        <select
                            value={selectedTerm}
                            onChange={(e) => { setSelectedTerm(e.target.value); setSelectedIds(new Set()); }}
                            className="pl-9 pr-4 py-2 border border-gray-400 rounded-md bg-white text-sm text-black font-semibold focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer hover:bg-gray-50"
                        >
                            <option value="all">ดูทั้งหมด</option>
                            <option disabled>──────────</option>
                            {availableTerms.map(term => (
                                <option key={term} value={term}>ภาคเรียนที่ {term}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    {/* Delete button — shows when items are selected */}
                    {selectedCount > 0 && (
                        <button
                            onClick={handleDeleteSelected}
                            disabled={isDeleting}
                            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white px-4 py-2 rounded-md transition-colors justify-center"
                        >
                            <Trash2Icon size={16} />
                            ลบที่เลือก ({selectedCount})
                        </button>
                    )}
                    <button
                        onClick={handleExportPDF}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors w-full md:w-auto justify-center"
                    >
                        <DownloadIcon size={18} />
                        Export PDF ({selectedTerm === "all" ? "All" : selectedTerm})
                    </button>
                </div>
            </div>

            {/* --- Table --- */}
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200 bg-white">
                    <thead className="bg-gray-50">
                        <tr>
                            {/* Select All checkbox */}
                            <th className="px-4 py-3 text-center w-10">
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                                    onChange={toggleSelectAll}
                                    className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                                    title="เลือกทั้งหมด"
                                />
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Term</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Week</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Advisor</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Topic</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Stats</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Absent</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Picture</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredReports.length === 0 ? (
                            <tr>
                                <td colSpan={11} className="px-6 py-8 text-center text-gray-500">
                                    <div className="flex flex-col items-center gap-2">
                                        <p>ไม่พบข้อมูลสำหรับเงื่อนไขที่เลือก</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredReports.map((report) => {
                                const isChecked = selectedIds.has(report.id);
                                return (
                                    <tr
                                        key={report.id}
                                        className={`transition-colors ${isChecked ? 'bg-red-50' : 'hover:bg-gray-50'}`}
                                    >
                                        <td className="px-4 py-4 text-center">
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => toggleSelect(report.id)}
                                                className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                                            />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">{report.term}/{report.academicYear}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">{report.date}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">{report.week}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-left">{report.advisorName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-left truncate max-w-[150px]" title={report.department}>
                                            {report.department}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">{report.classLevel}/{report.room}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-left truncate max-w-xs">{report.topic}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                                            <span className="text-green-600 font-medium">{report.presentStudents}</span>
                                            <span className="text-gray-400 mx-1">/</span>
                                            <span>{report.totalStudents}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-bold text-center">
                                            {report.absentStudents}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                                            {report.photoUrl ? (
                                                <a
                                                    href={report.photoUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
                                                >
                                                    <ImageIcon size={16} />
                                                    View
                                                </a>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* --- PIN Modal (same as AdvisorManagement) --- */}
            {dialog.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm shadow-xl">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
                        <div className={`p-4 border-b flex items-center gap-3 ${dialog.title === 'ข้อผิดพลาด' ? 'bg-red-50 text-red-700' : 'bg-red-50 text-red-800'}`}>
                            <AlertCircle size={24} className={dialog.title === 'ข้อผิดพลาด' ? 'text-red-500' : 'text-red-500'} />
                            <h3 className="font-bold text-lg">{dialog.title}</h3>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-700 mb-4">{dialog.message}</p>
                            {dialog.type === 'prompt' && (
                                <div className="relative">
                                    <input
                                        type={showPin ? 'text' : 'password'}
                                        autoFocus
                                        className="w-full border-2 border-gray-200 bg-gray-50 text-gray-900 text-lg sm:text-xl tracking-widest font-bold rounded-lg p-3 sm:p-4 pr-12 outline-none focus:bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/20 transition-all placeholder:text-gray-400 placeholder:text-base placeholder:font-normal placeholder:tracking-normal"
                                        placeholder="ใส่รหัสผ่านที่นี่..."
                                        value={dialog.inputValue}
                                        onChange={(e) => setDialog(prev => ({ ...prev, inputValue: e.target.value }))}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') dialog.onConfirm(dialog.inputValue);
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPin(p => !p)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                        tabIndex={-1}
                                    >
                                        {showPin ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-3 justify-end px-6 py-4 bg-gray-50 border-t">
                            {dialog.type === 'prompt' && (
                                <button
                                    type="button"
                                    onClick={closeDialog}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors font-medium"
                                >
                                    ยกเลิก
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => dialog.onConfirm(dialog.type === 'prompt' ? dialog.inputValue : undefined)}
                                className={`px-6 py-2 rounded-md transition-colors text-white font-medium shadow-sm ${dialog.title === 'ข้อผิดพลาด' || dialog.title === 'สำเร็จ' ? 'bg-red-500 hover:bg-red-600' : 'bg-red-600 hover:bg-red-700'}`}
                            >
                                {dialog.type === 'alert' ? 'ตกลง' : 'ยืนยัน'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}