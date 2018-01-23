'use strict';
const
    express = require('express'),
    bodyParser = require('body-parser'),
    app = express().use(bodyParser.json()),
    axios = require("axios"),
    request = require('request'),
    page_token = "EAAH5zZAimwRUBAAawrSPb5IZCYOb6T5U2M2ApwgsZAU8hRFmmwDrtaJv8X8sX3o6CV2imKszUTzJGoBdc6I7zQkFVKScWEdX4PSQXYCTJDUvZCgJd6PWwg8a7zflh8HZAPapdWeIX77LPbVE7PeZCM85gzPxZBf3ZCz5Ttlrft3d6gZDZD",
    api_token = "senha";

app.listen(process.env.PORT || 1337, (req, res) => console.log('Server is online')); //CONFIGURAÇÕES DO SERVIDOR


//API GET
app.get('/', (req, res) => {
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];
    if (mode && token) {
        if (mode === 'subscribe' && token === api_token) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
    res.send('<h1>WEBHOOK API</h1>');
});


//API POST
app.post('/', (req, res) => {
    //console.log(teste());
    let body = req.body;
    if (body.object === 'page') {
        body.entry.forEach(function (entry) {
            console.log(entry.messaging[0]);
            let webhook_event = entry.messaging[0];
            let sender_psid = webhook_event.sender.id;
            let url = `https://graph.facebook.com/v2.6/${sender_psid}?fields=first_name,last_name,profile_pic&access_token=${page_token}`;
            axios.get(url).then(function (response) {
                if (webhook_event.message) {
                    handleMessage(sender_psid, webhook_event.message, response.data);
                } else if (webhook_event.postback) {
                    handlePostback(sender_psid, webhook_event.postback, response.data);
                }
            }).catch(function (error) { });
        });
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});


//MANIPULADOR DE MENSAGEM
function handleMessage(sender_psid, received_message, userProfile) {
    let response;
    if (received_message.text) {
        if (userProfile) {
            response = {
                "attachment": {
                    "type": "template",
                    "payload": {
                        "template_type": "generic",
                        "elements": [{
                            "title": `Olá ${userProfile.first_name} ${userProfile.last_name}`,
                            "subtitle": "Esta é sua foto de perfil?",
                            "image_url": userProfile.profile_pic,
                            "buttons": [
                                {
                                    "type": "postback",
                                    "title": "Sim!",
                                    "payload": "yes",
                                },
                                {
                                    "type": "postback",
                                    "title": "Não!",
                                    "payload": "no",
                                }
                            ],
                        }]
                    }
                }
            }
        } else {
            response = { "text": `Olá, voce escreveu: ${received_message.text}` }
        }
        console.log("TEXTO RESPOSTA: " + response);
    } else if (received_message.attachments) {
        let attachment_url = received_message.attachments[0].payload.url;
        response = {
            "attachment": {
                "type": "template",
                "payload": {
                    "template_type": "generic",
                    "elements": [{
                        "title": "Is this the right picture?",
                        "subtitle": "Tap a button to answer.",
                        "image_url": attachment_url,
                        "buttons": [
                            {
                                "type": "postback",
                                "title": "Yes!",
                                "payload": "yes",
                            },
                            {
                                "type": "postback",
                                "title": "No!",
                                "payload": "no",
                            }
                        ],
                    }]
                }
            }
        }
    }
    callSendAPI(sender_psid, response);
}

//MANIPULADOR DE RESPOSTA
function handlePostback(sender_psid, received_postback) {
    let response;
    let payload = received_postback.payload;
    if (payload === 'yes') {
        response = { "text": "Eu já sabia!" }
    } else if (payload === 'no') {
        response = { "text": "Opa, acho que você mentiu rsrs" }
    }
    callSendAPI(sender_psid, response);
}

// FUNÇÃO DE ENVIO
function callSendAPI(sender_psid, response) {
    let request_body = {
        "recipient": {
            "id": sender_psid
        },
        "message": response
    }
    request({
        "uri": "https://graph.facebook.com/v2.6/me/messages",
        "qs": { "access_token": page_token },
        "method": "POST",
        "json": request_body
    }, (err, res, body) => {
        if (!err) {
            console.log('message sent!')
        } else {
            console.error("Unable to send message:" + err);
        }
    });
}