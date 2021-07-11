# NovidChain

NovidChain: Blockchain‐based privacy‐preserving platform for COVID‐19 test/vaccine certificates


## NovidChain: sample demo

See the video on youtube.

[![NovidChain Demo](https://img.youtube.com/vi/Zrn3Hzr45N0/mq3.jpg)](https://www.youtube.com/watch?v=Zrn3Hzr45N0)



## Installation

To get started, download the repo, run install and build, then find the code for this example in the examples folder:

``` bash
$ git clone https://github.com/amal-abid05/NovidChain.git
$ cd dApp
$ npm install
$ npm run build
$ cd app
```


## Create an Identity

We use sample application identities (e.g., private keys) to issue and verify credentials on a server. For
your own applications, you can create a new private key with this library, using the code snippet below:

```
$ node
> const { Credentials } = require('uport-credentials')
> Credentials.createIdentity()
{
  did: 'did:ethr:0x123...',
  privateKey: '3402abe3d...'
}
```

*Please note that in practice the signing key for the identity should remain private!*
*It is recommended to store the address and private key in environment variables for your server application and NOT
hardcode it in your source code.*


## Issuing Covid-19 credendials

Run the Credential Creator Service and open the URL in the terminal console output. This will request your DID
(identifier) with a QR code on the browser; once it receives a response, it will issue a credential to that DID and
send it through a push notification. The output can be found in terminal console.

``` bash
$ node createcredential.js
```

## Verifying Covid-19 credendials 

Once you have the credential in your uPort client, you can use the Requestor Service by running and opening the URL in
the terminal console output. It will ask that you share the credential you just received. Upon receiving the credential,
it will verify it. The output can be found in terminal console.

``` bash
$ node requestcredential.js
```

### Please cite the following paper if you used the code:

``` 
Abid, Amal, et al. "NovidChain: Blockchain‐based privacy‐preserving platform for COVID‐19 test/vaccine certificates." Software: Practice and Experience (2021).
Link: https://onlinelibrary.wiley.com/doi/full/10.1002/spe.2983
doi: https://doi.org/10.1002/spe.2983
```
