const express = require('express');
const bodyParser = require('body-parser')
const ngrok = require('ngrok');
var path = require("path");

const uport = require('../lib/index.js');
const decodeJWT = require('did-jwt').decodeJWT
const transports = require('uport-transports').transport
const message = require('uport-transports').message.util

const { Resolver } = require('did-resolver')
const { getResolver } = require('ethr-did-resolver')

let endpoint = ''
const messageLogger = (message, title) => {
  const wrapTitle = title ? ` \n ${title} \n ${'-'.repeat(60)}` : ''
  const wrapMessage = `\n ${'-'.repeat(60)} ${wrapTitle} \n`
  console.log(wrapMessage)
  console.log(message)
}






const providerConfig = { rpcUrl: 'https://rinkeby.infura.io/v3/a865dd4be008418a9b92f31f7de14b15' }
const resolver = new Resolver(getResolver(providerConfig))

var credentials = new uport.Credentials({
  did: 'did:ethr:0x195fb28e5a88a15b211faa4f35a74590f629fe88',
  privateKey: '3e26ca6e696d4ddd528c8b878e653f03d32aa693859c9ba84641ac2a04fc5b79',
  resolver
})

const app = express();
app.use(bodyParser.json({ type: '*/*' }))
var http = require('http');

const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

io.on('connection', (socket) => {
  console.log('a user connected');
});

/**
 *  First create a disclosure request, this time request the attestion/credentials already created
 *  by the Creator Service. The credential is identified by it's title/key, 'My Title' was used by
 *  the Creator Service. The callback is specified as the callback path of this server, seen below.
 *  This function will receive the response to this resquest from the uPort Client.
 */
app.get('/', (req, res) => {
  credentials.createDisclosureRequest({
    verified: ['COVID-19'],
    callbackUrl: endpoint + '/callback',
  }).then(requestToken => {
    const uri = message.paramsToQueryString(message.messageToURI(requestToken), { callback_type: 'post' })
    messageLogger(requestToken, 'Encoded Request URI to send to uPort Client (Signed JWT Wrapped with URI)')
    messageLogger(decodeJWT(requestToken), 'Decoded Request Token')
    const qr = transports.ui.getImageDataURI(uri)

    res.render('valid', { title: "App Covid", qrCode: qr, uri: uri })
  })
})

/**
 *  This function/path will receive the response from the uPort client to the request created above.
 *  Response is a signed JWT. authenticateDisclosureResponse can be used to verify the signature
 *  of the response payload and the signatures of credentials inclued in the response. You may want
 *  to verify additional parts of the data specific to your use case.
 */
 app.post('/callback', (req, res) => {
  const jwt = req.body.access_token;
  messageLogger(jwt, 'Response Token (Signed JWT)')
  messageLogger(decodeJWT(jwt), 'Raw Decoded Response Token')
  credentials.authenticateDisclosureResponse(jwt).then(creds => {
    messageLogger(creds, 'uPort Parsed and Verified Response')
    messageLogger(creds.verified[0], 'Credential Requested')
    messageLogger('Credential verified')

    let currentDate = new Date();
    //Flag Result 0 = Verification Failed , 1 = Certificate Valid , 2 = Certificate Invalid

    if(creds.verified[0].exp < currentDate.getTime()){
      io.emit('result', { data: 2 })
    }
    else{
      io.emit('result', { data: 1 })
    }
    res.send('<div><h1> COVID-19 Certificate: Valid </h1></div>')
  }).catch(err => {
    io.emit('result', { data: 0 })
    messageLogger('Verification failed')
  })
})

server.listen(8088, () => {
  ngrok.connect(8088).then(ngrokUrl => {
    endpoint = ngrokUrl
    console.log(`Requestor Service running, open at ${endpoint}`)
  })
})