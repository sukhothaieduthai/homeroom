"use client";

import { useState, useEffect } from "react";
import { Advisor } from "@/lib/google-sheets";
import { getAdvisorsAction } from "@/app/actions";
// import { cn } from "@/lib/utils"; // If needed for styling

interface AdvisorSelectorProps {
    year: number;
    onAdvisorSelect: (advisors: Advisor[]) => void;
}

export default function AdvisorSelector({ year, onAdvisorSelect }: AdvisorSelectorProps) {
    const [advisors, setAdvisors] = useState<Advisor[]>([]);
    const [departments, setDepartments] = useState<string[]>([]);

    const [selectedDepartment, setSelectedDepartment] = useState<string>("");
    const [selectedAdvisorId, setSelectedAdvisorId] = useState<string>("");

    useEffect(() => {
        async function loadAdvisors() {
            const data = await getAdvisorsAction(year);
            setAdvisors(data);
            const uniqueDepts = Array.from(new Set(data.map((a) => a.department)));
            setDepartments(uniqueDepts);
        }
        loadAdvisors();
    }, [year]);

    const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const dept = e.target.value;
        setSelectedDepartment(dept);
        setSelectedAdvisorId("");
        onAdvisorSelect([]);
    };

    const handleAdvisorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        setSelectedAdvisorId(id);

        const match = advisors.find(a => a.id === id);
        onAdvisorSelect(match ? [match] : []);
    };

    const filteredAdvisors = advisors.filter(
        (a) => a.department === selectedDepartment
    );

    return (
        <div className="space-y-4">
            {/* Department Selector */}
            <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">สาขาวิชา</label>
                <select
                    className="border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                    value={selectedDepartment}
                    onChange={handleDepartmentChange}
                >
                    <option value="">--- กรุณาเลือกสาขาวิชา ---</option>
                    {departments.map((dept) => (
                        <option key={dept} value={dept}>
                            {dept}
                        </option>
                    ))}
                </select>
            </div>

            {/* Advisor Selector */}
            <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">ครูที่ปรึกษา</label>
                <select
                    className="border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 text-gray-900"
                    value={selectedAdvisorId}
                    onChange={handleAdvisorChange}
                    disabled={!selectedDepartment}
                >
                    <option value="">--- กรุณาเลือกครูที่ปรึกษา ---</option>
                    {filteredAdvisors.map((advisor) => (
                        <option key={advisor.id} value={advisor.id}>
                            {advisor.name} ({advisor.classLevel}/{advisor.room})
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}
