# คู่มือและการแก้ไข Google Apps Script (v3.0 Auto-Healing Edition)

## 📌 สรุปปัญหาและการแก้ไขอัตโนมัติ (Auto-Healing)

### ปัญหาที่เคยเกิดขึ้น:
1. **รูปภาพไม่แสดงใน Preview / PDF**: เกิดจาก Google Apps Script คืนค่า URL แบบ `file.getUrl()` (`drive.google.com/file/d/ID/view`) ซึ่งไม่ใช่ลิงก์รูปภาพโดยตรง
2. **ต้องคอยแก้ไข Apps Script / Deploy ใหม่**: เมื่อมีการปรับเปลี่ยนสิทธิ์ไฟล์หรือ URL format
3. **โฟลเดอร์ปลายทางพัง**: หากใส่ `FOLDER_ID` ผิดหรือไม่ได้สร้างโฟลเดอร์ไว้
4. **ฟังก์ชั่นลบรูปพัง**: `google-drive.ts` มีการส่ง `action=delete` แต่ Apps Script เดิมรองรับแค่การอัปโหลด

---

## ⚡ วิธีทำให้ระบบ Auto-Update / Auto-Heal (ไม่ต้องแก้บ่อย)

ทางเราได้ปรับปรุงระบบทั้งฝั่ง **Next.js Web App** และ **Google Apps Script** ให้ทำงานแบบ **Auto-Healing**:

1. **ฝั่ง Web App (Next.js)**: 
   - เพิ่มระบบแปลง URL อัตโนมัติใน `lib/drive-utils.ts`, `lib/google-drive.ts`, `lib/google-sheets.ts` และ `app/api/pdf/route.ts`
   - **ต่อให้ Apps Script คืนค่า URL แบบเก่ามา หรือรูปใน Google Sheets จะเป็นลิงก์แบบใดก็ตาม** ระบบ Next.js จะแปลงเป็น `lh3.googleusercontent.com/d/FILE_ID` (High-Speed Direct Image CDN) ให้อัตโนมัติทันที

2. **ฝั่ง Google Apps Script (v3.0)**:
   - เพิ่มระบบ **Auto Folder Creation**: หากไม่ได้ใส่ `FOLDER_ID` หรือ ID ไม่ถูกต้อง ระบบจะสร้างและใช้โฟลเดอร์ชื่อ `"Homeroom_Uploads"` ใน Drive ให้อัตโนมัติ ไม่ขึ้นข้อผิดพลาด `Folder not found`
   - เพิ่มระบบ **Auto Sharing Permission**: ตั้งค่า `ANYONE_WITH_LINK` -> `VIEW` ให้รูปภาพเข้าถึงได้ทันทีโดยไม่ต้องกดแชร์เอง
   - เพิ่มระบบ **File Deletion Handler**: รองรับ `action=delete` เพื่อย้ายไฟล์ลงถังขยะเมื่อลบรายงาน

---

## 🚀 โค้ด Google Apps Script ฉบับสมบูรณ์ (v3.0)

คัดลอกโค้ดด้านล่างนี้ไปวางใน **Google Apps Script** (`https://script.google.com`) ของคุณได้เลย:

```javascript
/**
 * Homeroom System - Google Apps Script Backend (v3.0 Auto-Update Edition)
 * 
 * Instructions:
 * 1. Go to https://script.google.com
 * 2. Replace all code in Code.gs with this script
 * 3. Set FOLDER_ID (Optional): Leave as "" to auto-create "Homeroom_Uploads" folder in Drive.
 * 4. Click "Save" (💾)
 * 5. Click "Deploy" -> "Manage deployments" -> Edit (✏️) -> Version: "New version" -> Click "Deploy"
 */

// ใส่ Folder ID ที่ต้องการ หรือปล่อยว่างไว้เพื่อสร้างโฟลเดอร์ชื่อ "Homeroom_Uploads" อัตโนมัติ
var FOLDER_ID = ""; 

function doPost(e) {
  try {
    var params = e.parameter || {};
    var action = params.action || "upload";

    // 1. รองรับการลบไฟล์ (Action: delete)
    if (action === "delete") {
      var targetFileId = params.fileId;
      if (!targetFileId) {
        return createJsonResponse({ success: false, error: "Missing fileId for delete action" });
      }
      try {
        var fileToDelete = DriveApp.getFileById(targetFileId);
        fileToDelete.setTrashed(true);
        return createJsonResponse({ success: true, message: "File moved to trash", fileId: targetFileId });
      } catch (err) {
        return createJsonResponse({ success: false, error: "File delete error: " + err.toString() });
      }
    }

    // 2. รองรับการอัปโหลดไฟล์ (Action: upload)
    if (!params.file) {
      return createJsonResponse({ success: false, error: "No file data received" });
    }

    var base64Data = params.file;
    var fileName = params.fileName || ("homeroom_photo_" + new Date().getTime() + ".jpg");
    var mimeType = params.mimeType || "image/jpeg";

    var fileBlob = Utilities.newBlob(
      Utilities.base64Decode(base64Data),
      mimeType,
      fileName
    );

    // รับหรือสร้างโฟลเดอร์อัตโนมัติ
    var folder = getOrCreateFolder(FOLDER_ID);

    // สร้างไฟล์ใน Google Drive
    var file = folder.createFile(fileBlob);

    // ตั้งค่าสิทธิ์ให้อ่านได้สาธารณะผ่านลิงก์
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var fileId = file.getId();
    var directUrl = "https://lh3.googleusercontent.com/d/" + fileId;
    var ucUrl = "https://drive.google.com/uc?export=view&id=" + fileId;

    Logger.log("Uploaded successfully: " + fileName + " (ID: " + fileId + ")");

    return createJsonResponse({
      success: true,
      url: directUrl,
      ucUrl: ucUrl,
      fileId: fileId,
      fileName: fileName
    });

  } catch (error) {
    Logger.log("Error in doPost: " + error.toString());
    return createJsonResponse({
      success: false,
      error: error.toString()
    });
  }
}

// ฟังก์ชั่นค้นหาหรือสร้างโฟลเดอร์อัตโนมัติ
function getOrCreateFolder(folderId) {
  if (folderId && folderId.trim() !== "" && folderId !== "YOUR_FOLDER_ID_HERE") {
    try {
      return DriveApp.getFolderById(folderId.trim());
    } catch (e) {
      Logger.log("Specified Folder ID invalid, falling back to Homeroom_Uploads folder");
    }
  }
  
  var folderName = "Homeroom_Uploads";
  var folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  } else {
    return DriveApp.createFolder(folderName);
  }
}

// ช่วยคืนค่า JSON Response
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// สำหรับตรวจสอบสถานะ API (Health check)
function doGet(e) {
  return createJsonResponse({
    status: "online",
    service: "Homeroom Drive Upload API",
    version: "3.0",
    timestamp: new Date().toISOString()
  });
}
```

---

## 🛠️ ขั้นตอนการอัปเดต Apps Script (ทำเพียงครั้งเดียว)

1. ไปที่ [script.google.com](https://script.google.com) และเปิดโปรเจคของคุณ
2. ลบโค้ดเดิมทั้งหมดใน `Code.gs` แล้ววางโค้ด **v3.0** ด้านบนแทนที่
3. กด **บันทึก** (💾)
4. กด **Deploy** → **Manage deployments**
5. กดไอคอน ✏️ (Edit) ของ Deployment ปัจจุบัน
6. ตรงช่อง **Version** เลือก **New version**
7. กด **Deploy**

✨ เท่านี้ระบบจะทำงานเชื่อมต่อกับ Next.js แบบสมบูรณ์ รองรับการอัปโหลด ลบไฟล์ และแสดงผลรูปภาพในรายงาน PDF โดยไม่มีปัญหาเรื่องสิทธิ์หรือรูปแบบ URL อีกต่อไป!
