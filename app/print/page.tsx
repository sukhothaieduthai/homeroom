import FullReport from "@/components/FullReport";

export const metadata = {
    title: "ระบบพิมพ์รายงาน | วิทยาลัยอาชีวศึกษาสุโขทัย",
    description: "พิมพ์และดาวน์โหลดรายงานโฮมรูมในรูปแบบ PDF",
};

export default function PrintPage() {
    return <FullReport />;
}
