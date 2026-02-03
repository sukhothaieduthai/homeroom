# Update Log

## [2568-02-03] Switch to Node.js/npm
- Removed `bun.lock`
- Switched package manager from Bun to npm
- Updated project to use `package-lock.json`

## [2568-02-03] Connected to Real Google Sheets
I have connected the application to your Google Sheet: [Link](https://docs.google.com/spreadsheets/d/1OxFGfwJ7ZPMGmSZJo6ZcKSRwX8wTxN6kSkMTxmkVXbc/edit?gid=0#gid=0)

### ⚠️ IMPORTANT: You must setup the Sheet Columns manually

**Sheet 1 Name: `Advisor`** (Note: Singular "Advisor")
headers (Row 1):
- `ระดับชั้น`
- `ห้อง`
- `สาขาวิชา`
- `ครูที่ปรึกษา`

**Sheet 2 Name: `Reports`**
headers (Row 1) - **UPDATED**:
- `id`
- `term`
- `academicYear`
- `week`
- `date`
- `advisorName`
- `department`
- `classLevel`
- `room`
- `topic`
- `totalStudents`
- `presentStudents`
- `absentStudents`
- `photoUrl`
- `timestamp`

**Share Settings**:
Ensure the email `sukhothai@project-15f516f6-33e8-4587-a29.iam.gserviceaccount.com` has **Editor** access.

## [2568-02-04] PDF Generation Fix
- **Backend**: Switched to `puppeteer` (local) and `@sparticuz/chromium` (production/Vercel) for server-side PDF generation.
- **Font**: Using Google Font `Sarabun` to fix Thai vowel floating issues.
- **Layout**: PDF now renders efficiently with correct A4 layout and images.
- **Features**: Single "Smart" Download button based on current view (Cover, Table, Photos).
