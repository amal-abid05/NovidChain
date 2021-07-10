const express = require('express');
const bodyParser = require('body-parser')
const ngrok = require('ngrok');

const uport = require('../lib/index.js');
const decodeJWT = require('did-jwt').decodeJWT
const transports = require('uport-transports').transport
const message = require('uport-transports').message.util

const { Resolver } = require('did-resolver')
const { getResolver } = require('ethr-did-resolver')

const htmlTemplate = (qrImageUri, mobileUrl) => `<div><h1> Airport Verification</h1><img src="${qrImageUri}" /></div><div><a href="${mobileUrl}">Click here if on mobile</a><span id="resultid"</span></div>`
const htmlTemplate2 = () => `COVID-19 Certificate: Valid`
const htmlTemplate3 = () => `<script type="text/javascript"> document.getElementById("resultid").textContent="COVID-19 Certificate: Valid"; </script>`
let endpoint = '/login'
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

/**
 *  First create a disclosure request, this time request the attestion/credentials already created
 *  by the Creator Service. The credential is identified by it's title/key, 'My Title' was used by
 *  the Creator Service. The callback is specified as the callback path of this server, seen below.
 *  This function will receive the response to this resquest from the uPort Client.
 */
 
app.get('/login', (req, res) => {
  credentials.createDisclosureRequest({
    verified: ['COVID-19'],
    callbackUrl: endpoint,
  }).then(requestToken => {
    const uri = message.paramsToQueryString(message.messageToURI(requestToken), {callback_type: 'post'})
    messageLogger(requestToken, 'Encoded Request URI to send to uPort Client (Signed JWT Wrapped with URI)')
    messageLogger(decodeJWT(requestToken), 'Decoded Request Token')
    const qr =  transports.ui.getImageDataURI(uri)
    res.send(htmlTemplate(qr, uri))
  })
})

app.get('/', (req,res) => {
res.sendfile("valid.html")
})

/**
 *  This function/path will receive the response from the uPort client to the request created above.
 *  Response is a signed JWT. authenticateDisclosureResponse can be used to verify the signature
 *  of the response payload and the signatures of credentials inclued in the response. You may want
 *  to verify additional parts of the data specific to your use case.
 */
app.post('/login', (req, res) => {
  const jwt = req.body.access_token
  messageLogger(jwt, 'Response Token (Signed JWT)')
  messageLogger(decodeJWT(jwt), 'Raw Decoded Response Token')
  credentials.authenticateDisclosureResponse(jwt).then(creds => {
    messageLogger(creds, 'uPort Parsed and Verified Response')
    messageLogger(creds.verified[0], 'Credential Requested')
    messageLogger('Credential verified')
	res.send(htmlTemplate2())
	//res.redirect('./valid')
	
  }).catch( err => {
    messageLogger('Verification failed')
  })
})

const server = app.listen(8088, () => {
  /*ngrok.connect(8088).then(ngrokUrl => {
    endpoint = ngrokUrl
    console.log(`Requestor Service running, open at ${endpoint}`)
  }
  )*/
})
