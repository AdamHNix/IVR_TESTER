import express from "express";
import bodyParser from "body-parser";
import "dotenv/config";
import twilio from "twilio";

const app = express();
const port = 3000;
const { VoiceResponse } = twilio.twiml;

const accountSid = process.env.ACCOUNT_SID;
const authToken = process.env.AUTH_TOKEN;
const client = twilio(accountSid, authToken);

function findMatchingFlowSid(array, flowSid) {
  return array.find((item) => item[Object.keys(item)[0]] === flowSid);
}

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get("/api/greeting", (req, res) => {
  const name = req.query.name || "World";
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify({ greeting: `Hello ${name}!` }));
});

app.post("/voice", (req, res) => {
  // const To = req.body.To;
  const response = new VoiceResponse();
  res.set("Content-Type", "text/xml");
  res.send(response.toString());
});

app.post("/twilio-webhook", (req, res) => {
  let callSids = [];
  const twilioData = req.body[0].data;
  const flowSid = twilioData.flow_sid;
  if (twilioData.started_by) {
    callSids.push({ [twilioData.started_by]: twilioData.flow_sid });
  }
  let matchingItem = findMatchingFlowSid(callSids, flowSid);
  if (matchingItem) {
    let callSid = Object.keys(matchingItem)[0];
    if (twilioData.transitioned_to === "gather_digits") {
      console.log("submitting dtmf")
      client
        .calls(callSid)
        .update({
          method: "POST",
          url: `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${callSid}/Play.json`,
          digits: dtmfDigits,
        })
        .then((call) => {
          console.log("DTMF digits sent to the call:", call.sid);
          res.status(200).send("DTMF digits sent");
        })
        .catch((error) => {
          console.error("Error sending DTMF digits:", error);
          res.status(500).send("Failed to send DTMF digits");
        });
    }
  } else {
    console.log("No match found");
  }
  const dtmfDigits = "1"; // The DTMF digits you want to send

  console.log("Received webhook from Twilio:", req.body);
});

app.listen(port, () =>
  console.log(`Express server is running on localhost:${port}`),
);
