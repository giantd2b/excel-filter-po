const functions = require("firebase-functions");
const axios = require("axios");
const os = require("os")
const fs = require("fs");
const Path = require("path");
const vision = require("@google-cloud/vision");
const UUID = require("uuid-v4");

const admin = require("firebase-admin");
admin.initializeApp();
const firestore = admin.firestore();

const client = new vision.ImageAnnotatorClient();
// const client = new vision.ImageAnnotatorClient({
//   keyFilename: "./excel-filter-po-firebase-adminsdk-ab2ud-48647f8e6f.json",
// });
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
            let result = null;

            await axios({
              url: ` https://api-data.line.me/v2/bot/message/${msgID}/content`,
              method: "GET",
              headers: {
                //"Content-Type" : "application/json",
                Authorization: `Bearer ${accessTokens}`,
              },
              responseType: "stream",
            })
              .then(async (response) => {
                result = response.data;

                //async function process_RS(stream, cb) {
                var buffers = [];
                result.on("data", function (data) {
                  buffers.push(data);
                });
                result.on("end", async function () {
                  var buffer = Buffer.concat(buffers);

                  /* DO SOMETHING WITH workbook IN THE CALLBACK */

                  console.log(buffer);

                  const [result] = await client.objectLocalization(buffer);
                  const objects = result.localizedObjectAnnotations;
                  objects.forEach(async (object) => {
                    console.log(object);
                    //console.log(`Name: ${object.name}`);
                    //console.log(`Confidence: ${object.score}`);
                    if (object.name === "2D barcode" && object.score > 0.8) {
                      await file.save(buffer);
                      await file.makePublic();
                      url = await file.publicUrl();
                      await firestore
                        .collection("link")
                        .doc(messageID)
                        .set({ link: url, userid: userId });
                      console.log(url);
                      //linemsg.notic(`มีสลิปส่งมา ${url}`);
                      let slipAmount = getBankAmount(buffer);
                      let proFile = await getuserProfile(userId);
                      const promise1 = Promise.resolve(slipAmount);
                      const promise2 = Promise.resolve(proFile);

                      return Promise.all([promise1, promise2]).then(
                        ([value1, value2]) => {
                          linemsg.pushgroup(
                            `มีสลิปส่งมา ${url} \n จำนวน: ${
                              value1 !== undefined ? value1 : "ไม่มีข้อมูล"
                            }\n จากคุณ: ${value2.displayName}\n รูปโปร์ไฟล์: ${
                              value2.pictureUrl
                            }\n ช่องทาง: ${lineBot} `
                          );

                          console.log(value1); // 1 2
                        }
                      );
                    } else {
                      console.log("ไม่ใช่รูปสลิป");
                    }
                  });

                  return;
                });
              })
              .catch((error) => {
                console.log(error);
              });
            return res.end();
          }

          async function getBankAmount(buff) {
            let bankAmount = "";
            const [result] = await client.textDetection(buff);
            const detections = result.fullTextAnnotation.text;
            let detections2 = detections.trim();
            //console.log(detections.trim())
            if (
              detections2.includes(
                "ธ.กสิกรไทย"
              ) /*&& detections2.includes('สแกนตรวจสอบสลิป')*/
            ) {
              console.log("KBANK-SLIP");
              let index = detections2.search(/ค่าธรรมเนียม:/);
              //console.log(index)
              let index2 = detections2.slice(index, index + 23);
              //console.log(index2)
              let index25 = index2.replace(/,/g, "");
              //console.log(index25)
              let dotindex = index25.search(/\./);
              //console.log(dotindex);
              let index35 = index25.slice(dotindex - 7, dotindex);
              //console.log(index35);

              let index4 = index35.match(/\d+/g);
              let kbankAmount = index4[0];
              //console.log(kbankAmount);
              bankAmount = kbankAmount;
              return bankAmount;
            } else if (detections2.includes("SCB")) {
              console.log("SCB-SLIP");
              let index = detections2.search(/ตรวจสอบ/);
              let index2 = detections2.slice(index, index + 100);

              let index25 = index2.replace(/,/g, "");
              let index3 = index25.length;
              let index35 = index25.slice(index3 - 9, index3);
              //console.log(index35)
              let index4 = index35.search(/\n/g, "");
              let index45 = index35.slice(index4 + 1);
              //console.log(index45)
              let dotindex = index45.search(/\./);
              //console.log(dotindex);
              let index5 = index25.length;
              let index59 = index5 - dotindex;
              let index55 = index45.slice(dotindex - index59, dotindex);
              bankAmount = index55;
              return bankAmount;
            }
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
