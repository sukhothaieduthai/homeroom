# แก้ไข Google Apps Script สำหรับ Image URLs

## ปัญหา
รูปภาพที่อัปโหลดไปที่ Google Drive ไม่แสดงใน Preview และ PDF เพราะ URL ที่ได้มาจาก Apps Script ไม่สามารถใช้แสดงรูปโดยตรงได้

## วิธีแก้ไข

### 1. เปิด Google Apps Script
1. ไปที่ https://script.google.com
2. เปิดโปรเจค Apps Script ที่ใช้สำหรับอัปโหลดไฟล์

### 2. แก้ไขโค้ดใน `doPost` function

ค้นหาส่วนที่ return URL และแก้ไขดังนี้:

**จากเดิม (อาจเป็นแบบนี้):**
```javascript
function doPost(e) {
  try {
    var data = e.parameter;
    var fileBlob = Utilities.newBlob(Utilities.base64Decode(data.file), data.mimeType, data.fileName);
    
    var folder = DriveApp.getFolderById('YOUR_FOLDER_ID'); // หรือ DriveApp.getRootFolder()
    var file = folder.createFile(fileBlob);
    
    // ❌ ปัญหาอยู่ที่นี่ - getUrl() ให้ URL ที่ไม่แสดงรูปโดยตรง
    var fileUrl = file.getUrl();
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      url: fileUrl
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
```

**แก้ไขเป็น:**
```javascript
function doPost(e) {
  try {
    var data = e.parameter;
    var fileBlob = Utilities.newBlob(Utilities.base64Decode(data.file), data.mimeType, data.fileName);
    
    var folder = DriveApp.getFolderById('YOUR_FOLDER_ID'); // หรือ DriveApp.getRootFolder()
    var file = folder.createFile(fileBlob);
    
    // ✅ แก้ไขตรงนี้ - ใช้ setSharing และสร้าง direct URL
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    var fileId = file.getId();
    var directUrl = "https://drive.google.com/uc?export=view&id=" + fileId;
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      url: directUrl,
      fileId: fileId
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
```

### 3. บันทึกและ Deploy ใหม่
1. กด **Save** (💾)
2. กด **Deploy** → **Manage deployments**
3. กดไอคอน ✏️ (Edit) ที่ deployment ปัจจุบัน
4. เปลี่ยน **Version** เป็น **New version**
5. กด **Deploy**
6. คัดลอก URL ใหม่ (ถ้ามีการเปลี่ยนแปลง)

## สิ่งที่เปลี่ยนแปลง

1. **`setSharing()`** - ตั้งค่าไฟล์ให้สามารถเข้าถึงได้ด้วย link (Anyone with the link can view)
2. **Direct URL Format** - ใช้ `https://drive.google.com/uc?export=view&id=FILE_ID` แทน `file.getUrl()`
3. **Return fileId** - คืนค่า fileId เพิ่มเติมสำหรับ debugging

## ทดสอบ
หลังจากแก้ไขแล้ว:
1. ลองอัปโหลดรูปใหม่ในฟอร์ม
2. ตรวจสอบว่ารูปแสดงใน Preview
3. ลอง Download PDF ดูว่ามีรูปหรือไม่

## หมายเหตุ
- ถ้ายังไม่แสดงรูป ตรวจสอบว่า URL ที่ได้มีรูปแบบ `https://drive.google.com/uc?export=view&id=...`
- ถ้ารูปเก่ายังไม่แสดง เพราะ URL เป็นแบบเก่า ต้องลบและอัปโหลดใหม่
- ระบบมี utility function `convertToDriveDirectUrl()` ที่จะแปลง URL แบบเก่าให้เป็นแบบใหม่อัตโนมัติ

## แนบ: ตัวอย่าง Apps Script แบบเต็ม

```javascript
function doPost(e) {
  try {
    // รับข้อมูลจาก POST request
var data = e.parameter;
    
    // แปลง base64 เป็น Blob
    var fileBlob = Utilities.newBlob(
      Utilities.base64Decode(data.file), 
      data.mimeType, 
      data.fileName
    );
    
    // เลือก Folder ที่จะเก็บไฟล์
    // Option 1: ใช้ folder เฉพาะ (แนะนำ)
    var folder = DriveApp.getFolderById('YOUR_FOLDER_ID_HERE');
    
    // Option 2: ใช้ Root folder
    // var folder = DriveApp.getRootFolder();
    
    // สร้างไฟล์
    var file = folder.createFile(fileBlob);
    
    // ตั้งค่า sharing permission
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // สร้าง direct URL
    var fileId = file.getId();
    var directUrl = "https://drive.google.com/uc?export=view&id=" + fileId;
    
    Logger.log("File uploaded: " + data.fileName + " - ID: " + fileId);
    
    // Return success response
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      url: directUrl,
      fileId: fileId,
      fileName: data.fileName
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    Logger.log("Error: " + error.toString());
    
    // Return error response
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// สำหรับทดสอบ Web App
function doGet() {
  return ContentService.createTextOutput(JSON.stringify({
    status: "File Upload API is running",
    version: "2.0"
  })).setMimeType(ContentService.MimeType.JSON);
}
```
