const functions = require("firebase-functions");
const axios = require("axios");
const os = require("os")
const fs = require("fs");
const Path = require("path");
const UUID = require("uuid-v4");

const admin = require("firebase-admin");
admin.initializeApp();
const firestore = admin.firestore();

const { analyzeSlip } = require("./slip-detection");
const { findThaiPhones, formatThaiPhone } = require("./phone-utils");
exports.fbwebhook = require("./fbwebhook");
const sendMessageModule = require("./sendMessage");
exports.sendMessage = sendMessageModule.sendMessage;
exports.sendMessageHttp = sendMessageModule.sendMessageHttp;
const REGION = "asia-southeast1";
const linemsg = require("./linemsg");
const accessToken =
  "s8WPqMEgXCmmlpUJejk3lJP2xp7zVVngk0cJw6ibs49p7ZmHo9W7zv91mNjF15cmk+nbRXq8FoKhlbLCvIOgBmL6GXbfGSUzhpDPzIVp3WJHHXpJTlcdyxar7aziurCzpIgCQrxW6975HF/eabW4HwdB04t89/1O/w1cDnyilFU=";
const accessToken_IRIS =
  "R3eE8sfUlkLr1HhYZJT7+iOBa4voDFBM2+uFFQCmEieS0ZuYgyEAZI19nP8CDFhzOOJh1VczKwJcMEgCdEBO6tN1EsSzTXkHdDMbgtX8H+eTgmLnYXu8VEdtGZBMyP11pyD8cFy4f4OceoL3e5yDrwdB04t89/1O/w1cDnyilFU=";
const accessToken_TERMBOON =
  "8VTKu+/rmw02eWpgHpBNnzMMFqHDo41rc7HZfgbGhlVwfPWbk8RYVGuMyGCa/2LtoLxNfDV/ynu8NpqSA1scFMWg3hIjRNutHKH/EzlP4xeae6/YY78pXIbNUR4A92COzJBu8eZ6IeHSDc4zhwJnkgdB04t89/1O/w1cDnyilFU=";
const accessToken_CHON =
  "u+r28TJi8siieZzOk/fDeG0+u7TpP1byi/KAVADS7Bxjjo5FSya8StwKuaJAqyKClxOclWCVh/txdVIHbHuEWjOrjFx80XcGSaCn3X6pwWo0JV84BIAUVxUSkTY/KEqZZv/OFttjh+PmtBkJS2nx2AdB04t89/1O/w1cDnyilFU=";
const accessToken_Tohjeen =
  "OOW70D2Tw4P0hB/WbTAkVMKsrIbIpnfDK34IkboeqVm7iyynXsJwCaA0dKH/vX3B0IEj4lR8ZSsrOp6A5to3axLZws7Tv2QNV9y62/38FQzE4PVgaH2pPSCNbLLO0S4iFFJZA907GDBS2GO5x4Jd1QdB04t89/1O/w1cDnyilFU=";
exports.LineWebhook2 = functions.https //.region(REGION)
  .onRequest(async (req, res) => {
    let accessTokens = "";
    let lineBot = "";
    console.log(req.body.destination);
    switch (req.body.destination) {
      case "U2d0595a5f7582621a650a46e99972109":
        accessTokens = accessToken_IRIS;
        lineBot = "Line_IRIS";
        break;
      case "Uf18fee4c17bb410a565889f27015ace0":
        accessTokens = accessToken_TERMBOON;
        lineBot = "Line_เติมบุญ";
        break;
      case "U08f3963a8a32d32cadb457dde35dc897":
        accessTokens = accessToken;
        lineBot = "Line_ทดสอบระบบ";
        break;
      case "U55912d0c8784e0453127fe2ae2a7723e":
        accessTokens = accessToken_CHON;
        lineBot = "Line_Chon";
        break;
      case "U85b0000da2c00ce71e42c98dad76b2a9":
        accessTokens = accessToken_Tohjeen;
        lineBot = "Line_โต๊ะจีน";
        break;
    }
    const events = req.body.events;

    const destination = req.body.destination;
    async function getshareLink(link, mid) {
      const uuid = UUID()
      return await axios({
        url: link,
        method: "GET",
        responseType: "arraybuffer",
      }).then(async (response) => {
        result = response.data;
        const filename = `${mid}.jpg`;
        const tempLocalFile = Path.join(os.tmpdir(), filename);
        await fs.writeFileSync(tempLocalFile, result);
        const bucket = admin.storage().bucket();
        const file = await bucket.upload(tempLocalFile, {
          // กำหนด path ในการเก็บไฟล์แยกเป็นแต่ละ userId
          destination: `photos/${mid}/${filename}`,
          metadata: {
            cacheControl: "no-cache",
            metadata: {
              firebaseStorageDownloadTokens: uuid,
            },
          },
        });
        fs.unlinkSync(tempLocalFile);
        const prefix = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o`;
        const suffix = `alt=media&token=${uuid}`;
        //console.log(`${prefix}/${encodeURIComponent(file[0].name)}?${suffix}`)
        return `${prefix}/${encodeURIComponent(file[0].name)}?${suffix}`;
        //async function process_RS(stream, cb) {
        // var buffers = [];
        // result.on("data", function (data) {
        //   buffers.push(data);
        // });
        // result.on("end", async function () {
        //   var buffer = Buffer.concat(buffers);

        //   /* DO SOMETHING WITH workbook IN THE CALLBACK */

        //   await file.save(buffer);
        //   await file.makePublic();
        //   //url = await file.publicUrl();
        //   await firestore.collection("link").doc(mid).set({ link: publicUrl });

        //   return;
        // });
      });

    }
    async function getuserProfile(userid) {
      let result = null;

      return await axios({
        url: ` https://api.line.me/v2/bot/profile/${userid}`,
        method: "GET",
        headers: {
          //"Content-Type" : "application/json",
          Authorization: `Bearer ${accessTokens}`,
        },
        //responseType: "stream",
      })
        .then(async (response) => {
          result = response.data;
          //console.log(result);
          // let userdisplayName = result.displayName;
          // let userprofileUrl = result.pictureUrl;
          // linemsg.notic(
          //   ` จากคุณ ${userdisplayName}\n ส่งรูปภาพ จากช่องทาง ${lineBot} \n รูปโปร์ไฟล์ ${userprofileUrl} `
          // );
          return result;
        })
        .catch((error) => {
          console.log(error);
        });
    }

    console.log(` Destination is ${destination}`);
    for (const event of events) {
      if (event.type === "message") {
        const { replyToken, message, type, source } = event;
        console.log(`REPLYTOKEN is ${replyToken}`);
        if (event.message.type === "image") {
          //const { replyToken, message, type, source } = event;
          let userId = source.userId;
          const messageID = message.id;
          console.log(messageID);

          //let payload = null;
          const file = admin
            .storage()
            .bucket()
            .file(`slip/${messageID}-slip.jpg`);
          let fileURL = null;

          return await getConttent(messageID);
          async function getConttent(msgID) {
            try {
              const response = await axios({
                url: `https://api-data.line.me/v2/bot/message/${msgID}/content`,
                method: "GET",
                headers: {
                  Authorization: `Bearer ${accessTokens}`,
                },
                responseType: "arraybuffer",
              });

              const buffer = Buffer.from(response.data);
              const slipData = await analyzeSlip(buffer);

              if (slipData) {
                await file.save(buffer);
                await file.makePublic();
                const url = await file.publicUrl();

                const linkData = {
                  link: url,
                  userid: userId,
                  detected_at: admin.firestore.FieldValue.serverTimestamp(),
                };
                if (slipData.bank_name) linkData.bank_name = slipData.bank_name;
                if (slipData.amount) linkData.amount = slipData.amount;
                if (slipData.date_time) linkData.date_time = slipData.date_time;
                if (slipData.sender_name) linkData.sender_name = slipData.sender_name;
                if (slipData.receiver_name) linkData.receiver_name = slipData.receiver_name;
                if (slipData.reference_number) linkData.reference_number = slipData.reference_number;

                await firestore
                  .collection("link")
                  .doc(messageID)
                  .set(linkData);

                const proFile = await getuserProfile(userId);

                const lines = [`มีสลิปส่งมา ${url}`];
                if (slipData.bank_name) lines.push(`ธนาคาร: ${slipData.bank_name}`);
                if (slipData.amount) lines.push(`จำนวน: ${slipData.amount}`);
                if (slipData.date_time) lines.push(`วันที่: ${slipData.date_time}`);
                if (slipData.sender_name) lines.push(`ผู้โอน: ${slipData.sender_name}`);
                if (slipData.receiver_name) lines.push(`ผู้รับ: ${slipData.receiver_name}`);
                if (slipData.reference_number) lines.push(`อ้างอิง: ${slipData.reference_number}`);
                lines.push(`จากคุณ: ${proFile.displayName}`);
                lines.push(`ช่องทาง: ${lineBot}`);

                linemsg.pushgroup(lines.join("\n"));
                console.log("Slip detected and notified:", slipData);
              } else {
                console.log("ไม่ใช่รูปสลิป");
              }
            } catch (error) {
              console.log(error);
            }
            return res.end();
          }

        } else if (event.message.type === "text") {
          console.log(event);
          const messageID = message.id;
          let messageTime = event.timestamp;
          let userId = source.userId;

          try {
            // Fetch user profile from LINE API
            let proFile = await getuserProfile(userId);
            if (!proFile || !proFile.userId) {
              console.error(`Failed to get LINE profile for userId: ${userId}`);
              return res.end();
            }

            // Download profile picture (non-blocking - continue even if this fails)
            let profileImg = null;
            try {
              if (proFile.pictureUrl) {
                profileImg = await getshareLink(proFile.pictureUrl, userId);
              }
            } catch (imgError) {
              console.error(`Failed to download profile picture for ${userId}:`, imgError.message);
            }

            const userRef = admin.firestore().doc(`user/${proFile.userId}`);
            const messageText = message.text || "";
            const messagePreview = messageText.substring(0, 100);

            // Use transaction to prevent race conditions on concurrent messages
            await admin.firestore().runTransaction(async (transaction) => {
              const userDoc = await transaction.get(userRef);

              if (!userDoc.exists) {
                // New user - create profile + save message atomically
                const userData = {
                  userId: proFile.userId,
                  displayName: proFile.displayName,
                  statusMessage: proFile.statusMessage || "",
                  profile_pic: proFile.pictureUrl,
                  pictureUrl: profileImg || proFile.pictureUrl,
                  timestamp: messageTime,
                  channel: lineBot,
                  lastmessage: [message],
                  lastmessagetime: messageTime,
                  unreadCount: 1,
                  lastMessagePreview: messagePreview,
                };
                // Extract phone number from first message
                const phones = findThaiPhones(messageText);
                if (phones.length > 0) {
                  userData.phoneNumber = formatThaiPhone(phones[0]);
                }
                transaction.set(userRef, userData);
              } else {
                // Existing user - update fields
                const updateData = {
                  displayName: proFile.displayName,
                  lastmessage: admin.firestore.FieldValue.arrayUnion({
                    id: messageID,
                    text: messageText,
                    timesent: messageTime,
                  }),
                  lastmessagetime: messageTime,
                  unreadCount: admin.firestore.FieldValue.increment(1),
                  lastMessagePreview: messagePreview,
                };
                if (profileImg) {
                  updateData.pictureUrl = profileImg;
                  updateData.profile_pic = proFile.pictureUrl;
                }
                // Extract phone number if not already saved
                if (!userDoc.data().phoneNumber) {
                  const phones = findThaiPhones(messageText);
                  if (phones.length > 0) {
                    updateData.phoneNumber = formatThaiPhone(phones[0]);
                  }
                }
                transaction.update(userRef, updateData);
              }

              // Save message to subcollection within the same transaction
              const messageRef = userRef.collection("messages").doc(messageID);
              transaction.set(messageRef, {
                id: messageID,
                text: messageText,
                type: "incoming",
                sender: "user",
                timestamp: messageTime,
              });
            });

            console.log(`Successfully saved profile and message for user ${userId}`);
          } catch (error) {
            console.error(`Failed to process text message for user ${userId}:`, error);
          }

          return res.end();
        }
      }
    }
    return res.end();
  });
