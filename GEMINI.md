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
    -   Allows advisors to input data: Week, Date, Topic, Student Stats (Total, Present, Absent), Component photos.
    -   **Advisor Selection**: Smart 3-step dropdowns (Department -> Advisor Name -> Room) to handle advisors with multiple rooms.
    -   Auto-fetches details based on selection.
    -   Uploads photos to local storage (`public/uploads`) - *Planned: Migration to Google Drive*.

2.  **Reports Dashboard**:
    -   View submitted reports.
    -   Summary views.

3.  **PDF Generation**:
    -   Generates printable PDF reports for documentation.
    -   Uses **Puppeteer (Server-Side)** for both Full Reports and Summary Reports to ensure consistent rendering.
    -   **Thai Font Support**: Embeds "Sarabun" font directly into the PDF to prevent rendering issues on headless servers.
    -   Key issue addressed recently: Vercel deployment compatibility (using `@sparticuz/chromium`).

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
-   **Credentials**: Uses a Service Account Key (JSON) mechanism. Supports "Bridge Method" where a personal Service Account edits a shared Work Sheet if Org Policy blocks key creation.
-   **Mock Mode:** The application gracefully falls back to mock data if credentials are missing or invalid.

## Workflow
1.  User fills out `HomeroomForm`.
2.  Photos are uploaded via Server Action (`uploadPhotosAction`).
3.  Form data is saved to Google Sheets via `saveReportAction`.
4.  User can view reports or generate PDFs.

## Recent Updates / Context
-   **Advisor Selection**: Refactored `AdvisorSelector.tsx` to group by advisor name first, preventing duplicate entries for advisors with multiple rooms.
-   **Configuration**: Updated to use full JSON Service Account Key for robust authentication.
-   **PDF Deployment**: Optimizations for running Puppeteer on Vercel serverless functions.
-   **UI Refinement**: Tailwind CSS updates for better responsiveness and aesthetics.

## Setup
1.  `npm install`
2.  Set up `.env.local` with Google Creds (See `SETUP_GUIDE.md` for help).
3.  `npm run dev`
