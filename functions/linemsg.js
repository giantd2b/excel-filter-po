const axios = require("axios");
const qs = require('qs');

const lineNotitoken = "nYzE2loVhduFrDGiCFzxtKfni4UBSYh4nDGM1NIWrxJ"
const lineNotitoken2 = "NqnghLvgnsd1F41oVLtYjqfBhHt5zST6PH2uvZ4QtKZ"


exports.replytext = (replyToken, text,token) =>{
    let payload = {
        type: "text",
        text: text,
        
      };
    const params = {
        replyToken:replyToken,
        messages:[payload]
    }
    return axios({
        url:"https://api.line.me/v2/bot/message/reply",
        method:"POST",
        headers:{
            "Content-Type" : "application/json",
            "Authorization" : `Bearer ${token}`
        },
        data:params
    }).catch((error) =>{
        console.log(error)

    })
    

  }
exports.replys = (replyToken, payload,token) =>{

    const params = {
        replyToken:replyToken,
        messages:payload
    }
    return axios({
        url:"https://api.line.me/v2/bot/message/reply",
        method:"POST",
        headers:{
            "Content-Type" : "application/json",
            "Authorization" : `Bearer ${token}`
        },
        data:params
    }).catch((error) =>{
        console.log(error)
    })
    

  }
exports.replyimg = (replyToken, imgurl,token) =>{
    let payloads = {
        type: "image",
        originalContentUrl: imgurl,
        previewImageUrl: imgurl,
      };
    const params = {
        replyToken:replyToken,
        messages:[payloads]
    }
    return axios({
        url:"https://api.line.me/v2/bot/message/reply",
        method:"POST",
        headers:{
            "Content-Type" : "application/json",
            "Authorization" : `Bearer ${token}`
        },
        data:params
    }).catch((error) =>{
        console.log(error)
    })
    

  }
exports.push= (userid,payload) => {
    const params = {
        to:userid,
        messages:[payload]
    }
     axios({
        url:"https://api.line.me/v2/bot/message/push",
        method:"POST",
        headers:{
            "Content-Type" : "application/json",
            "Authorization" : `Bearer ${accessToken}`
        },
        data:params
    }).catch((error) =>{
        console.log(error)
    })
   }
exports.reply = (replyToken, payload,token) =>{

    const params = {
        replyToken:replyToken,
        messages:[payload]
    }
    return axios({
        url:"https://api.line.me/v2/bot/message/reply",
        method:"POST",
        headers:{
            "Content-Type" : "application/json",
            "Authorization" : `Bearer ${token}`
        },
        data:params
    }).catch((error) =>{
        console.log(error.response.data)
    })
  }

exports.notic = (payload) => {

    axios({
        url:"https://notify-api.line.me/api/notify",
        method:"POST",
        headers:{
            "Content-Type" : "application/x-www-form-urlencoded",
            "Authorization" : `Bearer ${lineNotitoken}`
        },
        data:`message=${payload}`
    }).catch((error) =>{
        console.log(error.data.details[0])
    })
}