# GEMINI.md - Project Context

## Project Overview
**Name:** Homeroom System (Sukhothai Vocational College)
**Description:** A web application for recording and reporting homeroom activities for keeping track of student attendance and advisor activities.
**Tech Stack:**
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Database:** Google Sheets (via `google-spreadsheet`)
- **PDF Generation:** Puppeteer / jsPDF

## Key Features
1.  **Homeroom Record Form (`HomeroomForm.tsx`)**:
    -   Allows advisors to input data: Week, Date, Topic, Student Stats (Total, Present, Absent), Activity photos.
    -   **Advisor Selection**: Smart 3-step dropdowns (Department → Advisor Name → Room) to handle advisors with multiple rooms.
    -   Auto-fetches details based on selection.
    -   Photos uploaded to Google Drive via Apps Script Web App.


2.  **Reports Dashboard (`FullReport.tsx`)**:
    -   View submitted reports in multiple formats (Cover, Table, Photos).
    -   Generate PDF reports with custom formatting.
    -   Filter by term, academic year, and advisor.

3.  **PDF Generation**:
    -   Generates printable PDF reports for documentation.
    -   Uses **Puppeteer (Server-Side)** for both Full Reports and Summary Reports to ensure consistent rendering.
    -   **Thai Font Support**: Embeds "Sarabun" font directly into the PDF to prevent rendering issues on headless servers.
    -   Key issue addressed recently: Vercel deployment compatibility (using `@sparticuz/chromium`).

4.  **Google Apps Script Integration**:
    -   All homeroom activity photos are uploaded via a Google Apps Script Web App instead of direct Google Drive API.
    -   Files are converted to base64 and sent via HTTP POST to the Apps Script endpoint.
    -   Apps Script handles the upload to Google Drive and returns publicly accessible URLs.
    -   **Why Apps Script?**: Avoids Service Account quota issues and simplifies authentication.
    -   **Setup Requirements**:
        -   Deploy a Google Apps Script Web App with file upload handling.
        -   Add the Web App URL to `GOOGLE_APPS_SCRIPT_URL` in `.env.local`.
        -   Apps Script runs under your Google account, using your Drive quota.

## Project Structure
-   `app/`: App Router pages and API routes.
    -   `actions.ts`: Server Actions for data fetching and saving (connects to Google Sheets).
    -   `api/pdf/`: Route for generating PDFs.
-   `components/`: Reusable UI components.
    -   `HomeroomForm.tsx`: Main data entry form.
    -   `AdvisorSelector.tsx`: Logic for selecting class/advisor (Updated to Advisor-First flow).
    -   `FullReport.tsx`: Detailed report view.
-   `lib/`: Utilities.
    -   `google-sheets.ts`: Core service logic for Google Sheets API connection (Advisors & Reports sheets).
-   `public/uploads`: Storage for uploaded activity photos.

## Configuration & Environment
-   **Environment Variables** (Required in `.env.local`):
    -   `GOOGLE_SHEET_ID`: ID of the Google Sheet used as DB.
    -   `GOOGLE_SERVICE_ACCOUNT_EMAIL`: Service account email.
    -   `GOOGLE_PRIVATE_KEY`: Private key for the service account.
    -   `GOOGLE_APPS_SCRIPT_URL`: URL of the Google Apps Script Web App for file uploads.
-   **Credentials**: Uses a Service Account Key (JSON) mechanism for Google Sheets access. File uploads go through Google Apps Script Web App.
-   **Mock Mode:** The application gracefully falls back to mock data if credentials are missing or invalid.

## Google Apps Script Setup
1.  **Create/Deploy Web App**: Deploy a Google Apps Script that accepts file uploads via POST
2.  **Get Web App URL**: Copy the deployment URL (format: `https://script.google.com/macros/s/.../exec`)
3.  **Add to Environment**: Set `GOOGLE_APPS_SCRIPT_URL` in `.env.local`
4.  **File Flow**: Form → Base64 encoding → POST to Apps Script → Upload to Drive → Return URL

## Workflow
1.  User fills out `HomeroomForm`.
2.  Photos are uploaded via Server Action (`uploadPhotosAction`).
3.  Form data is saved to Google Sheets via `saveReportAction`.
4.  User can view reports or generate PDFs.

## Recent Updates / Context
-   **Google Drive Image Display Fix** (2026-02-12): Fixed issue where Google Drive images weren't displaying in preview and PDF. Created `drive-utils.ts` with URL conversion utilities to transform Drive URLs into direct image format. See `APPS_SCRIPT_FIX.md` for required Google Apps Script modifications.
-   **Custom Filename Format** (2026-02-12): Implemented custom filename generation for uploaded photos. Files are now named with meaningful information: `{ชื่อครู}_T{เทอม}_{วันที่}_{ชื่อกิจกรรม}_{ลำดับ}.{ext}` instead of generic screenshot names. Special characters are sanitized and topic is truncated to 50 characters for filesystem compatibility.
-   **Photo Display Pagination** (2026-02-12): Updated photo view to display 6 photos per page instead of limiting to 6 total. When more than 6 photos exist, they are automatically split into multiple pages with repeated headers. Each continuation page shows "(ต่อ)" indicator.
-   **CORS Fix for Google Drive Images** (2026-02-12): Removed base64 image conversion attempt that caused CORS errors. Now passes Google Drive URLs directly to PDF generation API, which handles them server-side without cross-origin restrictions.
-   **File Upload Method** (2026-02-05): Switched from Google Drive API to Google Apps Script Web App to avoid quota/authentication issues. Files are now base64-encoded and POSTed to Apps Script endpoint.
-   **PDF Report Redesign** (2026-02-05): Updated table format in FullReport.tsx to match institutional requirements with proper column headers and data layout.
-   **Code Cleanup** (2026-02-05): Removed verbose debug console.log statements while keeping essential error logging.
-   **Advisor Selection**: Refactored `AdvisorSelector.tsx` to group by advisor name first, preventing duplicate entries for advisors with multiple rooms.
-   **Configuration**: Updated to use full JSON Service Account Key for Google Sheets. File uploads use Apps Script Web App.
-   **PDF Deployment**: Optimizations for running Puppeteer on Vercel serverless functions.
-   **UI Refinement**: Tailwind CSS updates for better responsiveness and aesthetics.

## Setup
1.  `npm install`
2.  Set up `.env.local` with Google Creds (See `SETUP_GUIDE.md` for help).
3.  `npm run dev`
