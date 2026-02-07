"use client";

import { useState, useEffect, useMemo } from "react";
import { Advisor } from "@/lib/google-sheets";
import { getAdvisorsAction } from "@/app/actions";

interface AdvisorSelectorProps {
    year: number;
    onAdvisorSelect: (advisors: Advisor[]) => void;
}

export default function AdvisorSelector({ year, onAdvisorSelect }: AdvisorSelectorProps) {
    const [advisors, setAdvisors] = useState<Advisor[]>([]);
    const [departments, setDepartments] = useState<string[]>([]);

    const [selectedDepartment, setSelectedDepartment] = useState<string>("");
    const [selectedAdvisorName, setSelectedAdvisorName] = useState<string>("");
    const [selectedAdvisorId, setSelectedAdvisorId] = useState<string>("");

    useEffect(() => {
        async function loadAdvisors() {
            const data = await getAdvisorsAction();
            setAdvisors(data);
            const uniqueDepts = Array.from(new Set(data.map((a) => a.department)));
            setDepartments(uniqueDepts);
        }
        loadAdvisors();
    }, [year]);

    // Derived state: Advisors in the selected department
    const advisorsInDept = useMemo(() => {
        return advisors.filter((a) => a.department === selectedDepartment);
    }, [advisors, selectedDepartment]);

    // Derived state: Unique advisor names in the selected department
    const uniqueAdvisorNames = useMemo(() => {
        return Array.from(new Set(advisorsInDept.map((a) => a.name)));
    }, [advisorsInDept]);

    // Derived state: Available rooms for the selected advisor name
    const availableRooms = useMemo(() => {
        return advisorsInDept.filter((a) => a.name === selectedAdvisorName);
    }, [advisorsInDept, selectedAdvisorName]);


    const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const dept = e.target.value;
        setSelectedDepartment(dept);

        // Reset subsequent selections
        setSelectedAdvisorName("");
        setSelectedAdvisorId("");
        onAdvisorSelect([]);
    };

    const handleAdvisorNameChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const name = e.target.value;
        setSelectedAdvisorName(name);

        // Reset room selection
        setSelectedAdvisorId("");
        onAdvisorSelect([]);
    };

    const handleRoomChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        setSelectedAdvisorId(id);

        const match = availableRooms.find(a => a.id === id);
        onAdvisorSelect(match ? [match] : []);
    };

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

            {/* Advisor Name Selector */}
            <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">ครูที่ปรึกษา</label>
                <select
                    className="border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 text-gray-900"
                    value={selectedAdvisorName}
                    onChange={handleAdvisorNameChange}
                    disabled={!selectedDepartment}
                >
                    <option value="">--- กรุณาเลือกครูที่ปรึกษา ---</option>
                    {uniqueAdvisorNames.map((name) => (
                        <option key={name} value={name}>
                            {name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Room/Level Selector */}
            <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">ระดับชั้น / ห้อง</label>
                <select
                    className="border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 text-gray-900"
                    value={selectedAdvisorId}
                    onChange={handleRoomChange}
                    disabled={!selectedAdvisorName}
                >
                    <option value="">--- กรุณาเลือกห้อง ---</option>
                    {availableRooms.map((advisor) => (
                        <option key={advisor.id} value={advisor.id}>
                            {advisor.classLevel} - ห้อง {advisor.room}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}
