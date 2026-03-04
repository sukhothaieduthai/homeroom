"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
    {
        href: "/record",
        label: "บันทึกกิจกรรมโฮมรูม",
        activeClass: "bg-blue-700 text-white shadow-md",
        inactiveClass: "bg-blue-100 text-blue-700 hover:bg-blue-200",
    },
    {
        href: "/report",
        label: "รายงานสรุปผล",
        activeClass: "bg-green-600 text-white shadow-md",
        inactiveClass: "bg-green-100 text-green-700 hover:bg-green-200",
    },
    {
        href: "/print",
        label: "ระบบพิมพ์รายงาน",
        activeClass: "bg-purple-600 text-white shadow-md",
        inactiveClass: "bg-purple-100 text-purple-700 hover:bg-purple-200",
    },
    {
        href: "/advisor",
        label: "จัดการข้อมูลครู",
        activeClass: "bg-orange-500 text-white shadow-md",
        inactiveClass: "bg-orange-100 text-orange-700 hover:bg-orange-200",
    },
];

export default function Navbar() {
    const pathname = usePathname();

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header Card */}
            <div className="bg-white rounded-xl shadow-sm p-6 text-center border-t-4 border-blue-400">
                <h1 className="text-2xl font-bold text-blue-700">แบบบันทึกกิจกรรมโฮมรูม</h1>
                <p className="text-blue-600 font-medium">วิทยาลัยอาชีวศึกษาสุโขทัย</p>
            </div>

            {/* Nav Links */}
            <div className="flex gap-4 justify-center md:justify-start flex-wrap">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (pathname === "/" && item.href === "/record");
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`px-6 py-2 rounded-md font-bold transition-all ${isActive ? item.activeClass : item.inactiveClass
                                }`}
                        >
                            {item.label}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
