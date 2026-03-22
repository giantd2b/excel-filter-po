//Reference from https://medium.com/@Astider/how-to-สร้าง-messenger-chatbot-แบบ-serverless-ด้วย-google-firebase-908c3eaba67e
const functions = require("firebase-functions");

// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require("firebase-admin");

const firestore = admin.firestore();

const linemsg = require("./linemsg");
const { analyzeSlip } = require("./slip-detection");
const { findThaiPhones, formatThaiPhone } = require("./phone-utils");

// Create and Deploy Your First Cloud Functions
// https://firebase.google.com/docs/functions/write-firebase-functions

const VERIFIED_TOKEN = "itpoom";
const TOKEN_TOHJEEN =
  "EAAMJZCDzvZAzUBOwuZAlIRvzFOZCB2DddEdTu49HFUsPZCbRjzW6BrnpZCxe8Fmrf6wH1O0UoS8ZCtujqGqomUiFhrlueZAZAXwLqrsJOQfr25dDy2EaZBmC4sK1jXovQS17lQqvfzZAbHmkzZC2QzEIRyCFNWJHKZAiem9Ua2qv0pNZC4WkdNlcZBaZBMjgPxI5barNbmidnWwlctSP2cibFAZDZD";
const TOKEN_IRIS =
  "EAAMJZCDzvZAzUBOyySuO4ddkgK8UeM7kbt05lukXrqfNrrEne1f0YiiNx6Bn6568CeUZBNKURg2YNJZBZBZBij479cN4U9LRFciRTl4hh99NH8sHyjH7nZAdY3LDPZA5311CcnZA9w1ohHwVn0B9xyyHuqNxl33yxGZCS8uJi1NqoCC6PgTsjKlirw1GXBrnUc31eq5PIn7IEpVQCZA9xUZD";
const TOKEN_IRIS_RAYONG =
  "EAAMJZCDzvZAzUBO9q3phjCvlCugfK9phH1enQiZCm4sskiCd05sBF1AOnv5FuhsSYLZAKYNqpVDTrR9krP0wVNZAC63fZCv1Fw42wZCsL741NoQeAWgZCEifyoGW6TYZCfUuZBruAvV4s74w4Osm397Pw5cv3onkOmp2Xy1WZAltPZAzQEFZAPVgSvK8DobyV7CRUKNXxA1jJwN3MB6qZB8QZDZD";
const TOKEN_TERMBOON =
  "EAAMJZCDzvZAzUBO5ZAbtko60HQ4wJpBdSM9yPuuVnOFLSvuR7yZCAhUJbGNmtZAMVLktXIZAt1Ax6KNsILZBPF29l4mj4o8Jn1IHEkwraZB8THAWl4L6IEvV9rxZCa5qGRHm6lPlGwJiyVS91L8TkUNHzDHZAl6jfh66sINo8IfMxbapt1u3UR9lE24cZAZBFApNmiZCn7Hijyt7ZA2kwviFkZD";
const TOKEN_CHON =
  "EAAMJZCDzvZAzUBO6DcUn5IBz1D8D93LvBlH0AHOUUhO1AxLPHSSO3vocol8UhPW05nNZCZAfNuDzWwCQMHZAyZCDR7Ntg0ag46SQM5Q3512MeXVsoD4P3hZAX4m3ukzgw41eZAuOYJZCZAvjrZAI8myaZBdtAeyPXKVmEQuYI6ZCHpauvFfrgiZCwpa6mOm62PYGcoyEdCTw9cCgNIHIt9q1YZD";
const YOUR_FACEBOOK_PAGETOKEN =
  "EAAoK6ST00pQBOy6SmGX0roRqRzKGA40Jg7HNQRo97BlkuOe8jDEY6LmaVonMV4ZC3T4GLNMFfX3ZCC8zfGIP104ZCFqIDsUvbig5dZC0fFrJfr7YidxpeC8aZCN8gbgjdRxQg4JUZCR3UO2PnNZA56Kf5031nY33EF6d0c8lfFsfjUUObrSZBkfTqHtQ8PUwDdO1Yo81xQl4LzIoNwZDZD";
  const YOUR_FACEBOOK_PAGETOKEN2 =
  "EAAMJZCDzvZAzUBO3mVvhOVsxYrWEVvcQcGB6fbaJb1gS69waO7g9VVguJI0ZCWqo7upgxkp7PoZAZASP9N48976aZCoOVqfA7iP9LyEOaLD8ocLA9nZB3lCOJZA0axKoLfYneU7vP7i81tgLhvXMZAawd7MJuLW1skGoqrFbvwM4WgkqoZBQOq69K5ktL1szy2cfCJjJZBczr3hbuO6NAsZD"
const TOKEN_GREENHOUSE =
  "EAAMJZCDzvZAzUBRDVhtQEoXEPkx9qWkN7AfXsmZAfSpDBQpolwOFz9BFvGurVdDSLJZBN3qZAuILYnTlo1ilxBHu101IXLeticDqrb1NbYAFlJyikw2dBh8j0itND29CZAi91cYCtqTAIeyZBk5KPoFxhS3iaSZAPZAYBRtvyZAFvnNQ6vROTA4Y4K9FQVIrR9mla0gV17ePldJuOZCLbEgZAXnaRAZDZD"
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
    case "2205446836437741":
      FACEBOOK_PAGETOKEN = YOUR_FACEBOOK_PAGETOKEN2;
      fbbot = "FB_ทดสอบระบบ2";
      break;
    case "100315376073691":
      FACEBOOK_PAGETOKEN = TOKEN_TOHJEEN;
      fbbot = "FB_โต๊ะจีน";
      break;
    case "190328791785664":
      FACEBOOK_PAGETOKEN = TOKEN_GREENHOUSE;
      fbbot = "FB_กรีนเฮ้าส์";
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
    const messagePreview = messageText.substring(0, 100);

    try {
      // Fetch user profile from Facebook API
      let proFile = await getProfile(senderID, FACEBOOK_PAGETOKEN);
      if (!proFile || !proFile.id) {
        console.error(`Failed to get Facebook profile for senderID: ${senderID}`);
        return;
      }

      // Download profile picture (non-blocking - continue even if this fails)
      let profileImg = null;
      try {
        if (proFile.profile_pic) {
          profileImg = await getshareLink(proFile.profile_pic, messageId);
        }
      } catch (imgError) {
        console.error(`Failed to download profile picture for ${senderID}:`, imgError.message);
      }

      const userRef = admin.firestore().doc(`user/${proFile.id}`);

      // Use transaction to prevent race conditions on concurrent messages
      await admin.firestore().runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);

        if (!userDoc.exists) {
          // New user - create profile + save message atomically
          const userData = {
            id: proFile.id,
            userId: proFile.id,
            first_name: proFile.first_name,
            last_name: proFile.last_name,
            displayName: `${proFile.first_name} ${proFile.last_name}`,
            profile_pic: proFile.profile_pic,
            pictureUrl: profileImg || proFile.profile_pic,
            timestamp: Date.now(),
            channel: fbbot,
            lastmessage: [{
              id: messageId,
              text: messageText,
              timesent: timeOfMessage,
            }],
            lastmessagetime: timeOfMessage,
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
            lastmessage: admin.firestore.FieldValue.arrayUnion({
              id: messageId,
              text: messageText,
              timesent: timeOfMessage,
            }),
            lastmessagetime: timeOfMessage,
            unreadCount: admin.firestore.FieldValue.increment(1),
            lastMessagePreview: messagePreview,
          };
          if (profileImg) {
            updateData.pictureUrl = profileImg;
            updateData.profile_pic = proFile.profile_pic;
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
        const messageRef = userRef.collection("messages").doc(messageId);
        transaction.set(messageRef, {
          id: messageId,
          text: messageText,
          type: "incoming",
          sender: "user",
          timestamp: timeOfMessage,
        });
      });

      console.log(`Successfully saved profile and message for user ${senderID}`);
    } catch (error) {
      console.error(`Failed to process text message for user ${senderID}:`, error);
    }

    return;
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

      await file.save(buffer);
      await file.makePublic();

      return;
    });
  });

  return publicUrl;
}

async function getConttent(msglink, senderid, mid, FBTOKEN, botname) {
  const file2 = admin.storage().bucket().file(`before/${mid}-slip.jpg`);

  try {
    const response = await axios({
      url: msglink,
      method: "GET",
      responseType: "arraybuffer",
    });

    const buffer = Buffer.from(response.data);
    const slipData = await analyzeSlip(buffer);

    if (slipData) {
      await file2.save(buffer);
      await file2.makePublic();
      const url = await file2.publicUrl();

      const linkData = {
        link: url,
        userid: senderid,
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
        .doc(mid)
        .set(linkData);

      const proFile = await getProfile(senderid, FBTOKEN);
      const profileImg = await getshareLink(proFile.profile_pic, mid);

      const lines = [`มีสลิปส่งมา ${url}`];
      if (slipData.bank_name) lines.push(`ธนาคาร: ${slipData.bank_name}`);
      if (slipData.amount) lines.push(`จำนวน: ${slipData.amount}`);
      if (slipData.date_time) lines.push(`วันที่: ${slipData.date_time}`);
      if (slipData.sender_name) lines.push(`ผู้โอน: ${slipData.sender_name}`);
      if (slipData.receiver_name) lines.push(`ผู้รับ: ${slipData.receiver_name}`);
      if (slipData.reference_number) lines.push(`อ้างอิง: ${slipData.reference_number}`);
      lines.push(`จากคุณ: ${proFile.first_name} ${proFile.last_name}`);
      lines.push(`รูปภาพโปรไฟล์: ${profileImg}`);
      lines.push(`ช่องทาง: ${botname}`);

      linemsg.pushgroup(lines.join("\n"));
      console.log("Slip detected and notified:", slipData);
    } else {
      console.log("ไม่ใช่รูปสลิป");
    }
  } catch (error) {
    console.log(error);
  }
}

