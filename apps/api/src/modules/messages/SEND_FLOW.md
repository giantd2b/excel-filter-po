# Message Send Flow - All Scenarios

## Web Dashboard → sendMessage API

### 1. Text only
- `text: "hello"`, no media, no sticker
- LINE: sends text message
- FB: sends text message

### 2. Image
- Upload first → `mediaUrl`, `mediaType: "image"`
- LINE: sends image message (originalContentUrl)
- FB: sends image attachment

### 3. Video
- Upload first → `mediaUrl`, `mediaType: "video"`
- LINE: sends video message
- FB: sends video attachment

### 4. File (PDF, doc, etc)
- Upload first → `mediaUrl`, `mediaType: "file"`, `text: "[ไฟล์: name.pdf]"`
- LINE: sends text with link (LINE API has no file type)
- FB: sends file attachment (type: "file")

### 5. LINE Sticker
- `stickerId`, `stickerPackageId`, no text, no media
- LINE: sends native sticker
- FB: sends sticker image via URL

### 6. Text + Image (not supported in UI but API handles it)
- Both text and image sent as separate messages
