const express = require('express')
const ngrok = require('ngrok')
const bodyParser = require('body-parser')
var path = require("path");

const uport = require('../lib/index.js')
const decodeJWT = require('did-jwt').decodeJWT
const transports = require('uport-transports').transport
const message = require('uport-transports').message.util

const { Resolver } = require('did-resolver')
const { getResolver } = require('ethr-did-resolver')


const htmlTemplate = (qrImageUri, mobileUrl) => `<div><h1> Scan the QR code </h1><img src="${qrImageUri}" /></div><div><a href="${mobileUrl}">Click here if on mobile</a></div>`
let currentDate = new Date();
//After one year expiration
// const expiration = currentDate.setMonth(currentDate.getMonth() + 12);
//after 2 minutes expiration date
const expiration = currentDate.setMinutes(currentDate.getMinutes() + 2);

let endpoint = ''
const messageLogger = (message, title) => {
  const wrapTitle = title ? ` \n ${title} \n ${'-'.repeat(60)}` : ''
  const wrapMessage = `\n ${'-'.repeat(60)} ${wrapTitle} \n`
  console.log(wrapMessage)
  console.log(message)
}

const app = express();
app.use(bodyParser.json({ type: '*/*' }))

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

const providerConfig = { rpcUrl: 'https://rinkeby.infura.io/v3/a865dd4be008418a9b92f31f7de14b15' }
const resolver = new Resolver(getResolver(providerConfig))

var credentials = new uport.Credentials({
  did: 'did:ethr:0x19a74ec21598d53f826c25b57325b3c5fcda12e8',
  privateKey: '7a408807e9554a3d3b779d3dbc02feca0780ef2928dc253f06da9b48d1de434a',
  resolver
})

/**
 *  First creates a disclosure request to get the DID (id) of a user. Also request push notification permission so
 *  a push can be sent as soon as a response from this request is received. The DID is used to create the attestation
 *  below. And a pushToken is used to push that attestation to a user.
 */
 
app.get('/', (req, res) => {
  credentials.createDisclosureRequest({
    notifications: true,
    callbackUrl: endpoint + '/callback'
  }).then(requestToken => {
    const uri = message.paramsToQueryString(message.messageToURI(requestToken), {callback_type: 'post'})
    const qr =  transports.ui.getImageDataURI(uri)

    res.render('credential', { title: "App Scan Covid", qrCode: qr, uri: uri })
  })
})

/**
 *  This function is called as the callback from the request above. We the get the DID here and use it to create
 *  an attestation. We also use the push token and public encryption key share in the respone to create a push
 *  transport so that we send the attestion to the user.
 */
app.post('/callback', (req, res) => {
  const jwt = req.body.access_token
  credentials.authenticateDisclosureResponse(jwt).then(creds => {
    const did = creds.did
    const pushToken = creds.pushToken
    const pubEncKey = creds.boxPub
    const push = transports.push.send(creds.pushToken, pubEncKey)
    credentials.createVerification({
      sub: did,
      exp: expiration,
      claim: {'COVID-19' : {'PCR' : 'PCR Test Negatif', 'Vaccine' : 'Vaccine Valid', 'Antibody' : 'Antibody Test Valid'} }
      // Note, the above is a complex claim. Also supported are simple claims:
      // claim: {'Key' : 'Value'}
    }).then(att => {
      messageLogger(att, 'Encoded Attestation Sent to User (Signed JWT)')
      messageLogger(decodeJWT(att), 'Decoded Attestation Payload of Above')
      return push(att)
    }).then(res => {
      messageLogger('Push notification with attestation sent, will recieve on client in a moment')
      ngrok.disconnect()
    })
  })
})

const server = app.listen(8088, () => {
  ngrok.connect(8088).then(ngrokUrl => {
    endpoint = ngrokUrl
    console.log(`Attestation Creator Service running, open at ${endpoint}`)
  });
})
