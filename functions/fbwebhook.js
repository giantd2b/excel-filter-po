//Reference from https://medium.com/@Astider/how-to-สร้าง-messenger-chatbot-แบบ-serverless-ด้วย-google-firebase-908c3eaba67e
const functions = require("firebase-functions");
const fs = require("fs");
const Path = require("path");
const vision = require("@google-cloud/vision");

// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require("firebase-admin");

const firestore = admin.firestore();
// const client = new vision.ImageAnnotatorClient({
//   keyFilename: "./servicesaccount.json",
// });
const client = new vision.ImageAnnotatorClient();

const linemsg = require("./linemsg");

// Create and Deploy Your First Cloud Functions
// https://firebase.google.com/docs/functions/write-firebase-functions

const VERIFIED_TOKEN = "itpoom";
const TOKEN_TOHJEEN =
  "EAAMJZCDzvZAzUBO30yXAXol7a0XMfAsWhMcIP9RNf2mBiZAaDSUYuY9smVdMWPOGXdrX5jPlivl0pRdlU0TLqKiS9JcE4ApHzWaEQNb4WX6xbonrZBncKcXu0uyS727fvYRCjbrRFnJKJKJvBdtM225feDcY9VBIZCbdRI7WHTPmWlA2EqJ6ZAlU5S5KWrbMIlHvYdTyQvCmUCswZDZD";
const TOKEN_IRIS =
  "EAAMJZCDzvZAzUBO2kYouBRqZA2rSzKZCEbJkmtd1B8YUmZCctzwnX6n4VsSPhMCvfEm5IoeB6OnZCmP7THTwYvz3XcXiMDus6ohqiR1Gy0DPoun2n1lxo7b3vkRfYk2hmmK2yn6xWJuR4CXxOZBbxM5dhJ3dSXqt26ovWxATaZBJhk0xUZAMK6KblBgoYjGT9pJR12lS1rrEykR7AszQZD";
const TOKEN_IRIS_RAYONG =
  "EAAMJZCDzvZAzUBOwuCCVkgdeB75ygwkaFnU2ZBOaTJ7JhZC9NcqM0yW08uTRGFYi9QDbWS7EdFJT8hiFA2ZCZCZCuoyrVFRMaeAE9E8a1juFw1tBN7e13SEwDpXExZBFfC9hzShrgLWBVA1PXUnUfXGUQhgZBEPSZA7ZCsEvozDHELZCZCh1MtZBXy8hsDYn8lboWbZAZBlVaDlcAuYd1Y0ZAPQZDZD";
const TOKEN_TERMBOON =
  "EAAMJZCDzvZAzUBOz249T3H8HRukAlrA7mySZBmmHZBFTlZBS2YaORRukuEFsbIJbLTqN4YX89hc8qrd0y49k5ZCAztJmrako0RgweXLbXfZChkKqNMZCGkDwFV7aiKo0Un59vZBqxufS1CmKfVr5pu0iFd4fcUF4fFrEf4JAths5tqyNWRvBeyp6AkEtHz7bAGhaRiFMDHPxwE1UqwkMZD";
const TOKEN_CHON =
  "EAAMJZCDzvZAzUBO6BnKZCNYJhuyxck2eBZApJUEQl9W5c980FCA4WWQO7it8GtLGVmdMZCDhYbVj08xq6rTht11ZCbywQ6e3PTYz5jPZBZAJC3fp0cg28MrmRjTlFZAZAQ9tzW4CdskoI7f64NVfsiZA5oftFijN3bhsHGcnZCBqBj8b6t1zSPfytGmGY5cdvbGI5spucbZAARLqSN2OMo0QZD";
const YOUR_FACEBOOK_PAGETOKEN =
  "EAAoK6ST00pQBOZB4UNt9RLWaNgwBvOxsCQUPVa6zKz4OZCDAo6B9ciZC6uIrZArPrzMCkyqjykVxF0Uggpq8P2167VSlhSDwrJ25ZBO4SxUQLT5y8qMY5ZBFZAmiS3IZCMlYcs7fpP8tuo9FtmuqqqGDiZBJyMvMBCNKcXFeYEdZAY9HxOubtd3ZAiSkw10Iga7ZBZBDsXCIzN2xY23Gr3gZDZD";
exports.fbwebhook = functions.https.onRequest(async (request, response) => {
  try {
    if (request.method == "GET") {
      if (
        request.query["hub.mode"] === "subscribe" &&
        request.query["hub.verify_token"] === VERIFIED_TOKEN
      ) {
        console.log("Validating webhook");
        console.log(request.query["hub.challenge"])
        response.status(200).send(request.query["hub.challenge"]);
        
      } else {
        console.error(
          "Failed validation. Make sure the validation tokens match."
        );
        response.sendStatus(403);
      }
    } else if (request.method == "POST") {
      var data = request.body;
      if (data.object === "page") {
        data.entry.forEach((entry) => {
          var pageID = entry.id;
          var timeOfEvent = entry.time;
          console.log(`entry : ${JSON.stringify(entry)}`);
          entry.messaging.forEach((event) => {
            if (event.message) {
              return receivedMessage(event);
            } else {
              console.log("Webhook received unknown event: ", event);
            }
          });
        });
        return response.sendStatus(200);
      }
      return;
    }
  } catch (error) {
    response.status(500).send(error);
  }
});

async function receivedMessage(event) {
  let senderID = event.sender.id;
  let recipientID = event.recipient.id;
  let timeOfMessage = event.timestamp;
  let message = event.message;
  let FACEBOOK_PAGETOKEN = "";
  let fbbot = "";
  switch (recipientID) {
    case "342502096352138":
      FACEBOOK_PAGETOKEN = TOKEN_IRIS;
      fbbot = "FB_IRIS";
      break;
    case "100433364819860":
      FACEBOOK_PAGETOKEN = TOKEN_IRIS_RAYONG;
      fbbot = "FB_IRIS_RAYONG";
      break;
    case "2323861754514969":
      FACEBOOK_PAGETOKEN = TOKEN_TERMBOON;
      fbbot = "FB_เติมบุญ";
      break;
    case "1179375335569460":
      FACEBOOK_PAGETOKEN = TOKEN_CHON;
      fbbot = "FB_ชล";
      break;
    case "111545563829281":
      FACEBOOK_PAGETOKEN = YOUR_FACEBOOK_PAGETOKEN;
      fbbot = "FB_ทดสอบระบบ";
      break;
    case "100315376073691":
      FACEBOOK_PAGETOKEN = TOKEN_TOHJEEN;
      fbbot = "FB_โต๊ะจีน";
      break;
  }

  //ถ้าข้อความมาแล้ว log ตรงนี้จะเห็นข้อความเลยครับ
  console.log(
    "Received message for user %d and page %d at %d with message:",
    senderID,
    recipientID,
    timeOfMessage
  );
  console.log(JSON.stringify(message));
  let messageId = message.mid;
  let messageText = message.text;
  let messageAttachments = message.attachments;
  let msg = "";

  if (messageText) {
    let proFile = await getProfile(senderID, FACEBOOK_PAGETOKEN);
    let profileImg = await getshareLink(proFile.profile_pic, messageId);
    const promise2 = Promise.resolve(proFile);
    const promise3 = Promise.resolve(profileImg);

    return Promise.all([promise2, promise3]).then(async ([value1, value2]) => {
      console.log(value1); // 1 2
      let userLast = await admin.firestore().doc(`user/${value1.id}`).get();
      if (!userLast.exists || userLast.data().id !== value1.id) {
        value1.userId = value1.id;
        value1.displayName = `${value1.first_name} ${value1.last_name}`;
        value1.pictureUrl = value2;
        value1.timestamp = Date.now();
        value1.channel = fbbot;
        value1.lastmessage = [];
        value1.lastmessage.push({
          id: messageId,
          text: messageText,
          timesent: timeOfMessage,
        });
        value1.lastmessagetime = timeOfMessage;
        await admin.firestore().doc(`user/${value1.id}`).set(value1);
        console.log("user...saved");

        return;
      } else {
        console.log(value1.id);

        const ref = admin.firestore().doc(`user/${value1.id}`);
        const myRef = await ref.update({
          lastmessage: admin.firestore.FieldValue.arrayUnion({
            id: messageId,
            text: messageText,
            timesent: timeOfMessage,
          }),
        });

        

        const updatedtime = await ref.update({lastmessagetime:timeOfMessage})

        console.log("Added last Chat");
        console.log("มีผู้ใช้นะในระบบ");
        return;
      }
    });
  } else if (messageAttachments) {
    let attachment_url = message.attachments[0].payload.url;

    //await getProfile(senderID,messageId,FACEBOOK_PAGETOKEN,fbbot)
    console.log(`URL ${attachment_url}`);
    console.log(event);
    return await getConttent(
      attachment_url,
      senderID,
      messageId,
      FACEBOOK_PAGETOKEN,
      fbbot
    );
  }
}

// function greeting(recipientId) {
//     let messageData = {
//         recipient: {
//             id: recipientId
//         },
//         message: {
//             text: "Hello"
//         }
//     }
//     callSendAPI(messageData)
// }

async function sendTextMessage(recipientId, messageText, token) {
  //จัดข้อความที่จะส่งกลับในรูปแบบ object ตามที่ Messenger กำหนด
  let messageData = {
    recipient: {
      id: recipientId,
    },
    message: {
      text: messageText, //,
      //metadata: "DEVELOPER_DEFINED_METADATA"
    },
  };
  callSendAPI(messageData, token);
}
function sendImageMessage(recipientId, messageImage, token) {
  //จัดข้อความที่จะส่งกลับในรูปแบบ object ตามที่ Messenger กำหนด
  let messageData = {
    recipient: {
      id: recipientId,
    },
    message: {
      attachment: {
        type: "image",
        payload: {
          url: messageImage,
          is_reusable: true,
        },
      },
    },
  };
  callSendAPI(messageData, token);
}

const axios = require("axios");

function callSendAPI(messageData, token) {
  console.log(`message data : ${JSON.stringify(messageData)}`);
  axios({
    method: "POST",
    url: "https://graph.facebook.com/v2.6/me/messages",
    params: {
      access_token: token,
    },
    data: messageData,
  })
    .then((response) => {
      if (response.status == 200) {
        let body = response.data;
        let recipientId = body.recipient_id;
        let messageId = body.message_id;
        if (messageId) {
          console.log(
            "Successfully sent message with id %s to recipient %s",
            messageId,
            recipientId
          );
        } else {
          console.log(
            "Successfully called Send API for recipient %s",
            recipientId
          );
        }
      } else {
        console.error(
          "Failed calling Send API",
          response.status,
          response.statusText,
          response.data.error
        );
      }
    })
    .catch((error) => {
      console.log("error : ${error}");
      console.log("axios send message failed");
    });
}

async function getProfile(pid, token) {
  // let profileName = "";

  // const file = admin.storage().bucket().file(`before/${mid}-profile.jpg`);
  // let fileURL = null;
  var config = {
    method: "get",
    url: `https://graph.facebook.com/${pid}?fields=first_name,last_name,profile_pic&access_token=${token}`,
    headers: {},
  };

  return await axios(config)
    .then(async function (response) {
      console.log(JSON.stringify(response.data));

      profileName = response.data.first_name;
      let imgProfile = response.data.profile_pic;
      return response.data;
    })
    .catch(function (error) {
      console.log(error);
    });
}

async function getshareLink(link, mid) {
  const file = admin.storage().bucket().file(`profile/${mid}-profile.jpg`);
  const publicUrl = file.publicUrl();

  await axios({
    url: link,
    method: "GET",
    responseType: "stream",
  }).then(async (response) => {
    result = response.data;

    //async function process_RS(stream, cb) {
    var buffers = [];
    result.on("data", function (data) {
      buffers.push(data);
    });
    result.on("end", async function () {
      var buffer = Buffer.concat(buffers);

      /* DO SOMETHING WITH workbook IN THE CALLBACK */

      await file.save(buffer);
      await file.makePublic();
      //url = await file.publicUrl();
      await firestore.collection("link").doc(mid).set({ link: publicUrl });

      return;
    });
  });

  return publicUrl;
}

async function getConttent(msglink, senderid, mid, FBTOKEN, botname) {
  let result = null;
  msgResult = [];

  const file2 = admin.storage().bucket().file(`before/${mid}-slip.jpg`);

  return await axios({
    url: ` ${msglink}`,
    method: "GET",
    headers: {
      //"Content-Type" : "application/json",
      //Authorization: `Bearer ${accessTokens}`,
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

        const [result] = await client.objectLocalization(buffer);
        const objects = result.localizedObjectAnnotations;
        objects.forEach(async (object) => {
          console.log(`Name: ${object.name}`);
          console.log(`Confidence: ${object.score}`);
          if (object.name === "2D barcode" && object.score > 0.8) {
            //await getProfile(senderid, mid, FBTOKEN, botname);
            await file2.save(buffer);
            await file2.makePublic();
            let url = await file2.publicUrl();
            await firestore
              .collection("link")
              .doc(mid)
              .set({ link: url, userid: senderid });
            console.log(url);
            //linemsg.notic(`มีสลิปส่งมา ${url}`);
            let slipAmount = await getBankAmount(buffer);

            let proFile = await getProfile(senderid, FBTOKEN);
            let profileImg = await getshareLink(proFile.profile_pic, mid);

            const promise1 = Promise.resolve(slipAmount);
            const promise2 = Promise.resolve(proFile);
            const promise3 = Promise.resolve(profileImg);

            return Promise.all([promise1, promise2, promise3]).then(
              ([value1, value2, value3]) => {
                linemsg.notic(
                  `มีสลิปส่งมา ${url} \n จำนวน: ${
                    value1 !== undefined ? value1 : "ไม่มีข้อมูล"
                  }\nจากคุณ: ${value2.first_name} ${
                    value2.last_name
                  }\nรูปภาพโปรไฟล์: ${value3}\nช่องทาง:${botname}
                  `
                );

                console.log(`this is value2:${value2}`); // 1 2
                console.log(`this is value3:${value3}`); // 1 2
                //sendTextMessage(senderid,"รับยอดครับ",FBTOKEN)
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
  return;
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
    let index2 = detections2.slice(index, index + 120);
    //console.log(index2)
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
