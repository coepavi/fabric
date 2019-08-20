/**
 * Copyright 2017 IBM All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an 'AS IS' BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
'use strict';
var log4js = require('log4js');
var logger = log4js.getLogger('SampleWebApp');
var express = require('express');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var http = require('http');
var util = require('util');
var app = express();
var expressJWT = require('express-jwt');
var jwt = require('jsonwebtoken');
var bearerToken = require('express-bearer-token');
var cors = require('cors');
var fs = require('./config/exchangeRate.json');
var invoiceCreation = require('./app/invoke-invoice')

require('./config.js');
var hfc = require('fabric-client');

var helper = require('./app/helper.js');
var createChannel = require('./app/create-channel.js');
var join = require('./app/join-channel.js');
var updateAnchorPeers = require('./app/update-anchor-peers.js');
var install = require('./app/install-chaincode.js');
var instantiate = require('./app/instantiate-chaincode.js');
var invoke = require('./app/invoke-transaction.js');
var query = require('./app/query.js');
var host = process.env.HOST || hfc.getConfigSetting('host');
var port = process.env.PORT || hfc.getConfigSetting('port');
///////////////////////////////////////////////////////////////////////////////
//////////////////////////////// SET CONFIGURATONS ////////////////////////////
///////////////////////////////////////////////////////////////////////////////
app.options('*', cors());
app.use(cors());
//support parsing of application/json type post data
app.use(bodyParser.json());
//support parsing of application/x-www-form-urlencoded post data
app.use(bodyParser.urlencoded({
	extended: false
}));
/*
/// set secret variable
app.set('secret', 'thisismysecret');
app.use(expressJWT({
	secret: 'thisismysecret'
}).unless({
	path: ['/users']
}));
app.use(bearerToken());
app.use(function(req, res, next) {
	logger.debug(' ------>>>>>> new request for %s',req.originalUrl);
	if (req.originalUrl.indexOf('/users') >= 0) {
		return next();
	}

	var token = req.token;
	jwt.verify(token, app.get('secret'), function(err, decoded) {
		if (err) {
			res.send({
				success: false,
				message: 'Failed to authenticate token. Make sure to include the ' +
					'token returned from /users call in the authorization header ' +
					' as a Bearer token'
			});
			return;
		} else {
			// add the decoded user name and org name to the request object
			// for the downstream code to use
			req.username = decoded.username;
			req.orgname = decoded.orgName;
			logger.debug(util.format('Decoded from JWT token: username - %s, orgname - %s', decoded.username, decoded.orgName));
			return next();
		}
	});
});
*/
///////////////////////////////////////////////////////////////////////////////
//////////////////////////////// START SERVER /////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
var server = http.createServer(app).listen(port, function() {});
logger.info('****************** SERVER STARTED ************************');
logger.info('***************  http://%s:%s  ******************',host,port);
server.timeout = 240000;

function getErrorMessage(field) {
	var response = {
		success: false,
		message: field + ' field is missing or Invalid in the request'
	};
	return response;
}

///////////////////////////////////////////////////////////////////////////////
///////////////////////// REST ENDPOINTS START HERE ///////////////////////////
///////////////////////////////////////////////////////////////////////////////
// Register and enroll user
app.post('/users', async function(req, res) {
	var username = req.body.username;
	var orgName = req.body.orgName;
	logger.debug('End point : /users');
	logger.debug('User name : ' + username);
	logger.debug('Org name  : ' + orgName);
	if (!username) {
		res.json(getErrorMessage('\'username\''));
		return;
	}
	if (!orgName) {
		res.json(getErrorMessage('\'orgName\''));
		return;
	}
	var token = jwt.sign({
		exp: Math.floor(Date.now() / 1000) + parseInt(hfc.getConfigSetting('jwt_expiretime')),
		username: username,
		orgName: orgName
	}, app.get('secret'));
	let response = await helper.getRegisteredUser(username, orgName, true);
	logger.debug('-- returned from registering the username %s for organization %s',username,orgName);
	if (response && typeof response !== 'string') {
		logger.debug('Successfully registered the username %s for organization %s',username,orgName);
		response.token = token;
		res.json(response);
	} else {
		logger.debug('Failed to register the username %s for organization %s with::%s',username,orgName,response);
		res.json({success: false, message: response});
	}

});
// Create Channel
app.post('/channels', async function(req, res) {
	logger.info('<<<<<<<<<<<<<<<<< C R E A T E  C H A N N E L >>>>>>>>>>>>>>>>>');
	logger.debug('End point : /channels');
	var channelName = req.body.channelName;
	var channelConfigPath = req.body.channelConfigPath;
	logger.debug('Channel name : ' + channelName);
	logger.debug('channelConfigPath : ' + channelConfigPath); //../artifacts/channel/mychannel.tx
	if (!channelName) {
		res.json(getErrorMessage('\'channelName\''));
		return;
	}
	if (!channelConfigPath) {
		res.json(getErrorMessage('\'channelConfigPath\''));
		return;
	}

	let message = await createChannel.createChannel(channelName, channelConfigPath, req.username, req.orgname);
	res.send(message);
});
// Join Channel
app.post('/channels/:channelName/peers', async function(req, res) {
	logger.info('<<<<<<<<<<<<<<<<< J O I N  C H A N N E L >>>>>>>>>>>>>>>>>');
	var channelName = req.params.channelName;
	var peers = req.body.peers;
	logger.debug('channelName : ' + channelName);
	logger.debug('peers : ' + peers);
	logger.debug('username :' + req.username);
	logger.debug('orgname:' + req.orgname);

	if (!channelName) {
		res.json(getErrorMessage('\'channelName\''));
		return;
	}
	if (!peers || peers.length == 0) {
		res.json(getErrorMessage('\'peers\''));
		return;
	}

	let message =  await join.joinChannel(channelName, peers, req.username, req.orgname);
	res.send(message);
});
// Update anchor peers
app.post('/channels/:channelName/anchorpeers', async function(req, res) {
	logger.debug('==================== UPDATE ANCHOR PEERS ==================');
	var channelName = req.params.channelName;
	var configUpdatePath = req.body.configUpdatePath;
	logger.debug('Channel name : ' + channelName);
	logger.debug('configUpdatePath : ' + configUpdatePath);
	if (!channelName) {
		res.json(getErrorMessage('\'channelName\''));
		return;
	}
	if (!configUpdatePath) {
		res.json(getErrorMessage('\'configUpdatePath\''));
		return;
	}

	let message = await updateAnchorPeers.updateAnchorPeers(channelName, configUpdatePath, req.username, req.orgname);
	res.send(message);
});
// Install chaincode on target peers
app.post('/chaincodes', async function(req, res) {
	logger.debug('==================== INSTALL CHAINCODE ==================');
	var peers = req.body.peers;
	var chaincodeName = req.body.chaincodeName;
	var chaincodePath = req.body.chaincodePath;
	var chaincodeVersion = req.body.chaincodeVersion;
	var chaincodeType = req.body.chaincodeType;
	logger.debug('peers : ' + peers); // target peers list
	logger.debug('chaincodeName : ' + chaincodeName);
	logger.debug('chaincodePath  : ' + chaincodePath);
	logger.debug('chaincodeVersion  : ' + chaincodeVersion);
	logger.debug('chaincodeType  : ' + chaincodeType);
	if (!peers || peers.length == 0) {
		res.json(getErrorMessage('\'peers\''));
		return;
	}
	if (!chaincodeName) {
		res.json(getErrorMessage('\'chaincodeName\''));
		return;
	}
	if (!chaincodePath) {
		res.json(getErrorMessage('\'chaincodePath\''));
		return;
	}
	if (!chaincodeVersion) {
		res.json(getErrorMessage('\'chaincodeVersion\''));
		return;
	}
	if (!chaincodeType) {
		res.json(getErrorMessage('\'chaincodeType\''));
		return;
	}
	let message = await install.installChaincode(peers, chaincodeName, chaincodePath, chaincodeVersion, chaincodeType, req.username, req.orgname)
	res.send(message);});
// Instantiate chaincode on target peers
app.post('/channels/:channelName/chaincodes', async function(req, res) {
	logger.debug('==================== INSTANTIATE CHAINCODE ==================');
	var peers = req.body.peers;
	var chaincodeName = req.body.chaincodeName;
	var chaincodeVersion = req.body.chaincodeVersion;
	var channelName = req.params.channelName;
	var chaincodeType = req.body.chaincodeType;
	var fcn = req.body.fcn;
	var args = req.body.args;
	logger.debug('peers  : ' + peers);
	logger.debug('channelName  : ' + channelName);
	logger.debug('chaincodeName : ' + chaincodeName);
	logger.debug('chaincodeVersion  : ' + chaincodeVersion);
	logger.debug('chaincodeType  : ' + chaincodeType);
	logger.debug('fcn  : ' + fcn);
	logger.debug('args  : ' + args);
	if (!chaincodeName) {
		res.json(getErrorMessage('\'chaincodeName\''));
		return;
	}
	if (!chaincodeVersion) {
		res.json(getErrorMessage('\'chaincodeVersion\''));
		return;
	}
	if (!channelName) {
		res.json(getErrorMessage('\'channelName\''));
		return;
	}
	if (!chaincodeType) {
		res.json(getErrorMessage('\'chaincodeType\''));
		return;
	}
	if (!args) {
		res.json(getErrorMessage('\'args\''));
		return;
	}

	let message = await instantiate.instantiateChaincode(peers, channelName, chaincodeName, chaincodeVersion, chaincodeType, fcn, args, req.username, req.orgname);
	res.send(message);
});

// Dap delivery
app.post('/channels/Delivery', async function (req, res) {
	logger.debug('==================== INVOKE Delivery ON CHAINCODE ==================');

	var args = [];
	var peers = "peer0.org1.example.com"
	var channelName = "mychannel"
	var chaincodeName = "mycc1"
	var username = "Jim"
	var orgName = "Org1"
	var fcn = "createDelivery"
	var msg = ""
	var data = null;
	try {

		var iDoc = req.body.ZDELVRY03_IS105;
		console.log("Idoc Format  ", iDoc);
		if (iDoc === undefined || iDoc === null || iDoc.length < 1) {
			res.status(500);
			res.json("Invalid Arguments");
		}
		else {

			if (iDoc.E1EDL20 == null || iDoc.E1EDL20 == undefined || iDoc.E1EDL20.XABLN == null || iDoc.E1EDL20.XABLN == undefined || iDoc.E1EDL20.XABLN.length < 1) {

				args.push("")
			} else {
				console.log("Shipment Number  = E1EDL20.XABLN ", iDoc.E1EDL20.XABLN);
				args.push(iDoc.E1EDL20.XABLN)
			}
			if (iDoc.E1EDL20 == null || iDoc.E1EDL20 == undefined || iDoc.E1EDL20.E1EDL24 == null || iDoc.E1EDL20.E1EDL24 == undefined || iDoc.E1EDL20.E1EDL24.MATNR == null || iDoc.E1EDL20.E1EDL24.MATNR == undefined || iDoc.E1EDL20.E1EDL24.MATNR.length < 1) {

				args.push("")
			} else {
				console.log("Material Doc Number =  E1EDL20.E1EDL24.MATNR ", iDoc.E1EDL20.E1EDL24.MATNR);
				args.push(iDoc.E1EDL20.E1EDL24.MATNR)
			}
			if (iDoc.E1EDL20 == null || iDoc.E1EDL20 == undefined || iDoc.E1EDL20.E1EDL24 == null || iDoc.E1EDL20.E1EDL24 == undefined || iDoc.E1EDL20.E1EDL24.E1EDL41.BSTNR == null || iDoc.E1EDL20.E1EDL24.E1EDL41.BSTNR == undefined || iDoc.E1EDL20.E1EDL24.E1EDL41 == null || iDoc.E1EDL20.E1EDL24.E1EDL41 == undefined || iDoc.E1EDL20.E1EDL24.E1EDL41.BSTNR.length < 1) {

				args.push("")
			} else {
				console.log("Purchase Order = E1EDL24.E1EDL41.BSTNR ", iDoc.E1EDL20.E1EDL24.E1EDL41.BSTNR)
				args.push(iDoc.E1EDL20.E1EDL24.E1EDL41.BSTNR)
			}
			if (iDoc.E1EDL20 == null || iDoc.E1EDL20 == undefined || iDoc.E1EDL20.E1EDL24 == null || iDoc.E1EDL20.E1EDL24 == undefined || iDoc.E1EDL20.E1EDL24.E1EDL43[0] == null || iDoc.E1EDL20.E1EDL24.E1EDL43[0] == undefined || iDoc.E1EDL20.E1EDL24.E1EDL43[0].QUALF == null || iDoc.E1EDL20.E1EDL24.E1EDL43[0].QUALF == undefined || iDoc.E1EDL20.E1EDL24.E1EDL43[0].QUALF.length < 1) {

				args.push("")
			} else {
				console.log("E1EDL43 Length = ", iDoc.E1EDL20.E1EDL24.E1EDL43.length)
				console.log("E1EDL43[0].QUALF = E1EDL24.E1EDL43[0].QUALF ", iDoc.E1EDL20.E1EDL24.E1EDL43[0].QUALF)
				args.push(iDoc.E1EDL20.E1EDL24.E1EDL43[0].QUALF)
			}
			if (iDoc.E1EDL20 == null || iDoc.E1EDL20 == undefined || iDoc.E1EDL20.E1EDL24 == null || iDoc.E1EDL20.E1EDL24 == undefined || iDoc.E1EDL20.E1EDL24.E1EDL43[0] == null || iDoc.E1EDL20.E1EDL24.E1EDL43[0] == undefined || iDoc.E1EDL20.E1EDL24.E1EDL43[0].BELNR == null || iDoc.E1EDL20.E1EDL24.E1EDL43[0].BELNR == undefined || iDoc.E1EDL20.E1EDL24.E1EDL43[0].BELNR.length < 1) {

				args.push("")
			} else {
				console.log("E1EDL43[0].BELNR = E1EDL24.E1EDL43[0].BELNR ", iDoc.E1EDL20.E1EDL24.E1EDL43[0].BELNR)
				args.push(iDoc.E1EDL20.E1EDL24.E1EDL43[0].BELNR)
			}
			if (iDoc.E1EDL20 == null || iDoc.E1EDL20 == undefined || iDoc.E1EDL20.E1EDL24 == null || iDoc.E1EDL20.E1EDL24 == undefined || iDoc.E1EDL20.E1EDL24.E1EDL43[1] == null || iDoc.E1EDL20.E1EDL24.E1EDL43[1] == undefined || iDoc.E1EDL20.E1EDL24.E1EDL43[1].QUALF == null || iDoc.E1EDL20.E1EDL24.E1EDL43[1].QUALF == undefined || iDoc.E1EDL20.E1EDL24.E1EDL43[1].QUALF.length < 1) {

				args.push("")
			} else {
				console.log("E1EDL43[1].QUALF = E1EDL24.E1EDL43[1].QUALF ", iDoc.E1EDL20.E1EDL24.E1EDL43[1].QUALF)
				args.push(iDoc.E1EDL20.E1EDL24.E1EDL43[1].QUALF)
			}
			if (iDoc.E1EDL20 == null || iDoc.E1EDL20 == undefined || iDoc.E1EDL20.E1EDL24 == null || iDoc.E1EDL20.E1EDL24 == undefined || iDoc.E1EDL20.E1EDL24.E1EDL43[1] == null || iDoc.E1EDL20.E1EDL24.E1EDL43[1] == undefined || iDoc.E1EDL20.E1EDL24.E1EDL43[1].BELNR == null || iDoc.E1EDL20.E1EDL24.E1EDL43[1].BELNR == undefined || iDoc.E1EDL20.E1EDL24.E1EDL43[1].BELNR.length < 1) {

				args.push("")
			} else {
				console.log("E1EDL43[1].BELNR =  E1EDL24.E1EDL43[1].BELNR ", iDoc.E1EDL20.E1EDL24.E1EDL43[1].BELNR)
				args.push(iDoc.E1EDL20.E1EDL24.E1EDL43[1].BELNR)
			}
			//Adding Date Field
			var today = new Date();
			var dd = String(today.getDate()).padStart(2, '0');
			var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0 !
			var yyyy = today.getFullYear();

			//today = dd + '-' + mm + '-' + yyyy;
			let todayString = yyyy + '-' + mm + '-' + dd;


			console.log("TODAY ===== ", todayString)
			var day2 = new Date(yyyy, mm, dd)
			//today = "12-05-2019"
			//var unix = Math.round((new Date(today)) / 1000); 
			var unix = Math.floor(day2 / 1000);
			console.log("TODAY's UNIX DATE === ", unix)
			args.push(unix.toString())
			console.log(args);
			console.log("Length of args    ", args.length)

			// method invoking chaincode 
			var message = await invoke.invokeChaincode(peers, channelName, chaincodeName, fcn, args, username, orgName);
			console.log("Message == ", message)
			msg = message.message;
			if (message.success == true) {
				if (iDoc.E1EDL20 == null || iDoc.E1EDL20 == undefined || iDoc.E1EDL20.E1EDL24 == null || iDoc.E1EDL20.E1EDL24 == undefined || iDoc.E1EDL20.E1EDL24.E1EDL43[1] == null || iDoc.E1EDL20.E1EDL24.E1EDL43[1] == undefined || iDoc.E1EDL20.E1EDL24.E1EDL43[1].BELNR == null || iDoc.E1EDL20.E1EDL24.E1EDL43[1].BELNR == undefined || iDoc.E1EDL20.E1EDL24.E1EDL43[1].BELNR.length < 1) {

					let response = msg + " and Invoice Creation Failed due to invalid Argument in E1EDL20.E1EDL24.E1EDL43[1].BELNR ";
					res.status(500);
					res.send(response)
				} else {
					data = {
						E1EDK01: {
							BELNR: iDoc.E1EDL20.E1EDL24.E1EDL43[0].BELNR,
							CURCY: fs.EUREUR.CCY,
							HWAER: fs.EUREUR.LCY,
							WKURS: fs.EUREUR.RTE,
							E1EDK02: [
								{
									QUALF: "J",
									BELNR: iDoc.E1EDL20.E1EDL24.E1EDL43[1].BELNR
								}
							]
						}
					}
					let invoiceResponse = await invoiceCreation.invokeInvoiceCreation(data);
					console.log("Invoice Message == ", invoiceResponse)
					let response = msg + " and " + invoiceResponse
					res.send(response)
				}

			} else {
				res.send("Request Failed to create delivery  in  Blockchain due to " + message.message + " , Please try again")
			}
		}
	} catch (e) {
		console.log("Exception Occured", e)
		res.status(500);
		res.send("Exception Occured")
	}

});

//dap invoice posting

app.post('/channels/InvoiceResponse', async function (req, res) {
	logger.debug('==================== INVOKE InvoiceResponse ON CHAINCODE ==================');
	console.log("Req == ", req.body)
	var idoc1 = req.body.ZEXPINV4_IV01;
	var idoc2 = req.body.ZEXPINV4_IV01.IDOC;
	var idoc = req.body.ZEXPINV4_IV01.IDOC.E1EDK01;
	var args = [];
	var peers = "peer0.org1.example.com"
	var channelName = "mychannel"
	var chaincodeName = "mycc2"
	var username = "Jim"
	var orgName = "Org1"
	var fcn = "createInvoice"
	var msg = ""
	console.log("Idoc Format ", idoc1);
	try {
		/*	if (idoc1 === undefined || idoc1 === null || idoc1.length < 1 || idoc2 === undefined || idoc2 === null || idoc2.length < 1 || idoc === undefined || idoc === null || idoc.length < 1) {
				res.status(500);
				res.json("Invalid Arguments");
			}*/

		var idoc1 = req.body.ZEXPINV4_IV01;
		var idoc2 = req.body.ZEXPINV4_IV01.IDOC;
		var idoc = req.body.ZEXPINV4_IV01.IDOC.E1EDK01;
		if (idoc1 === undefined || idoc1 === null || idoc1.length < 1) {
			res.status(500);
			res.json("Invalid Arguments");
		} else if (idoc2 === undefined || idoc2 === null || idoc2.length < 1) {
			res.status(500);
			res.json("Invalid Arguments");
		} else if (idoc === undefined || idoc === null || idoc.length < 1) {
			res.status(500);
			res.json("Invalid Arguments");
		}
		else {

			console.log("idoc ", idoc)
			//Demo2 starts	E1EDK01 - Currency details
			if (idoc.CURCY == null || idoc.CURCY == undefined || idoc.CURCY.length < 1) {
				args.push("")
			} else {
				console.log("E1EDK01.CURCY = ", idoc.CURCY)

				args.push(idoc.CURCY)
			}
			if (idoc.HWAER == null || idoc.HWAER == undefined || idoc.HWAER.length < 1) {
				args.push("")
			} else {
				console.log("E1EDK01.HWAER = ", idoc.HWAER)

				args.push(idoc.HWAER)
			}
			if (idoc.WKURS == null || idoc.WKURS == undefined || idoc.WKURS.length < 1) {
				args.push("")
			} else {
				console.log("E1EDK01.WKURS = ", idoc.WKURS)

				args.push(idoc.WKURS)
			}
			//Demo2 ends

			if (idoc.ZTERM == null || idoc.ZTERM == undefined || idoc.ZTERM.length < 1) {

				args.push("")
			} else {
				console.log("ZTERM = ", idoc.ZTERM)

				args.push(idoc.ZTERM)
			}
			if (idoc.BELNR == null || idoc.BELNR == undefined || idoc.BELNR.length < 1) {
				args.push("")
			} else {
				console.log("E1EDK01.BELNR = ", idoc.BELNR)

				args.push(idoc.BELNR)
			}
			if (idoc.NTGEW == null || idoc.NTGEW == undefined || idoc.NTGEW.length < 1) {
				args.push("")

			} else {
				console.log("E1EDK01.NTGEW = ", idoc.NTGEW)

				args.push(idoc.NTGEW)
			}
			if (idoc.BRGEW == null || idoc.BRGEW == undefined || idoc.BRGEW.length < 1) {
				args.push("")

			} else {
				console.log("E1EDK01.BRGEW = ", idoc.BRGEW)

				args.push(idoc.BRGEW)
			}
			if (idoc.GEWEI == null || idoc.GEWEI == undefined || idoc.GEWEI.length < 1) {
				args.push("")

			} else {
				console.log("E1EDK01.GEWEI = ", idoc.GEWEI)

				args.push(idoc.GEWEI)
			}
			if (idoc.RECIPNT_NO == null || idoc.RECIPNT_NO == undefined || idoc.RECIPNT_NO.length < 1) {

				//			console.log("E1EDK01.RECIPNT_NO = ", idoc.RECIPNT_NO)
				args.push("")
			} else {
				console.log("E1EDK01.RECIPNT_NO = ", idoc.RECIPNT_NO)
				args.push(idoc.RECIPNT_NO)
			}
			//Demo2 starts	E1EDKA1
			if (idoc.Z1EDK01_IV01.VBUND == null || idoc.Z1EDK01_IV01.VBUND == undefined || idoc.Z1EDK01_IV01.VBUND.length < 1) {
				args.push("")
			} else {
				console.log("E1EDK01.Z1EDK01_IV01.VBUND = ", idoc.Z1EDK01_IV01.VBUND)
				args.push(idoc.Z1EDK01_IV01.VBUND)
			}
			console.log("E1EDKA1 started")
			if (idoc2.E1EDKA1[0] == null || idoc2.E1EDKA1[0] == undefined || idoc2.E1EDKA1[0].PARVW == null || idoc2.E1EDKA1[0].PARVW == undefined || idoc2.E1EDKA1[0].PARVW.length < 1) {
				args.push("")

			} else {

				console.log("E1EDKA1[0].PARVW = ", idoc2.E1EDKA1[0].PARVW)

				args.push(idoc2.E1EDKA1[0].PARVW)
			}
			console.log("E1EDKA1 end ----")
			if (idoc2.E1EDKA1[0] == null || idoc2.E1EDKA1[0] == undefined || idoc2.E1EDKA1[0].PARTN == null || idoc2.E1EDKA1[0].PARTN == undefined || idoc2.E1EDKA1[0].PARTN.length < 1) {
				args.push("")

			} else {

				console.log("E1EDKA1[0].PARTN = ", idoc2.E1EDKA1[0].PARTN)

				args.push(idoc2.E1EDKA1[0].PARTN)
			}
			if (idoc2.E1EDKA1[0] == null || idoc2.E1EDKA1[0] == undefined || idoc2.E1EDKA1[0].LIFNR == null || idoc2.E1EDKA1[0].LIFNR == undefined || idoc2.E1EDKA1[0].LIFNR.length < 1) {
				args.push("")

			} else {

				console.log("E1EDKA1[0].LIFNR = ", idoc2.E1EDKA1[0].LIFNR)

				args.push(idoc2.E1EDKA1[0].LIFNR)
			}
			if (idoc2.E1EDKA1[1] == null || idoc2.E1EDKA1[1] == undefined || idoc2.E1EDKA1[1].PARVW == null || idoc2.E1EDKA1[1].PARVW == undefined || idoc2.E1EDKA1[1].PARVW.length < 1) {
				args.push("")

			} else {

				console.log("E1EDKA1[1].PARVW = ", idoc2.E1EDKA1[1].PARVW)

				args.push(idoc2.E1EDKA1[1].PARVW)
			}
			if (idoc2.E1EDKA1[1] == null || idoc2.E1EDKA1[1] == undefined || idoc2.E1EDKA1[1].PARTN == null || idoc2.E1EDKA1[1].PARTN == undefined || idoc2.E1EDKA1[1].PARTN.length < 1) {
				args.push("")

			} else {

				console.log("E1EDKA1[1].PARTN = ", idoc2.E1EDKA1[1].PARTN)

				args.push(idoc2.E1EDKA1[1].PARTN)
			}
			if (idoc2.E1EDKA1[2] == null || idoc2.E1EDKA1[2] == undefined || idoc2.E1EDKA1[2].PARVW == null || idoc2.E1EDKA1[2].PARVW == undefined || idoc2.E1EDKA1[2].PARVW.length < 1) {
				args.push("")

			} else {

				console.log("E1EDKA1[2].PARVW = ", idoc2.E1EDKA1[2].PARVW)

				args.push(idoc2.E1EDKA1[2].PARVW)
			}
			if (idoc2.E1EDKA1[2] == null || idoc2.E1EDKA1[2] == undefined || idoc2.E1EDKA1[2].PARTN == null || idoc2.E1EDKA1[2].PARTN == undefined || idoc2.E1EDKA1[2].PARTN.length < 1) {
				args.push("")

			} else {

				console.log("E1EDKA1[2].PARTN = ", idoc2.E1EDKA1[2].PARTN)

				args.push(idoc2.E1EDKA1[2].PARTN)
			}
			if (idoc2.E1EDKA1[3] == null || idoc2.E1EDKA1[3] == undefined || idoc2.E1EDKA1[3].PARVW == null || idoc2.E1EDKA1[3].PARVW == undefined || idoc2.E1EDKA1[3].PARVW.length < 1) {
				args.push("")

			} else {

				console.log("E1EDKA1[3].PARVW = ", idoc2.E1EDKA1[3].PARVW)

				args.push(idoc2.E1EDKA1[3].PARVW)
			}
			if (idoc2.E1EDKA1[3] == null || idoc2.E1EDKA1[3] == undefined || idoc2.E1EDKA1[3].PARTN == null || idoc2.E1EDKA1[3].PARTN == undefined || idoc2.E1EDKA1[3].PARTN.length < 1) {
				args.push("")

			} else {

				console.log("E1EDKA1[3].PARTN = ", idoc2.E1EDKA1[3].PARTN)

				args.push(idoc2.E1EDKA1[3].PARTN)
			}
			//Demo2 ends */
			console.log("E1EDK02 started")
			if (idoc2.E1EDK02[0] == null || idoc2.E1EDK02[0] == undefined || idoc2.E1EDK02[0].QUALF == null || idoc2.E1EDK02[0].QUALF == undefined || idoc2.E1EDK02[0].QUALF.length < 1) {
				args.push("")

			} else {

				console.log("E1EDK01.E1EDK02[0].QUALF = ", idoc2.E1EDK02[0].QUALF)

				args.push(idoc2.E1EDK02[0].QUALF)
			}
			if (idoc2.E1EDK02[0] == null || idoc2.E1EDK02[0] == undefined || idoc2.E1EDK02[0].BELNR == null || idoc2.E1EDK02[0].BELNR == undefined || idoc2.E1EDK02[0].BELNR.length < 1) {
				args.push("")

			} else {

				console.log("E1EDK01.E1EDK02[0].BELNR = ", idoc2.E1EDK02[0].BELNR)

				args.push(idoc2.E1EDK02[0].BELNR)
			}
			if (idoc2.E1EDK02[0] == null || idoc2.E1EDK02[0] == undefined || idoc2.E1EDK02[0].DATUM == null || idoc2.E1EDK02[0].DATUM == undefined || idoc2.E1EDK02[0].DATUM.length < 1) {
				args.push("")

			} else {

				console.log("E1EDK01.E1EDK02[0].DATUM = ", idoc2.E1EDK02[0].DATUM)

				args.push(idoc2.E1EDK02[0].DATUM)
			}

			if (idoc2.E1EDK02[1] == null || idoc2.E1EDK02[1] == undefined || idoc2.E1EDK02[1].QUALF == null || idoc2.E1EDK02[1].QUALF == undefined || idoc2.E1EDK02[1].QUALF.length < 1) {
				args.push("")

			} else {

				console.log("E1EDK01.E1EDK02[1].QUALF = ", idoc2.E1EDK02[1].QUALF)

				args.push(idoc2.E1EDK02[1].QUALF)
			}

			if (idoc2.E1EDK02[1] == null || idoc2.E1EDK02[1] == undefined || idoc2.E1EDK02[1].BELNR == null || idoc2.E1EDK02[1].BELNR == undefined || idoc2.E1EDK02[1].BELNR.length < 1) {
				args.push("")

			} else {
				console.log("E1EDK01.E1EDK02[1].BELNR = ", idoc2.E1EDK02[1].BELNR)

				args.push(idoc2.E1EDK02[1].BELNR)
			}

			if (idoc2.E1EDK02[1] == null || idoc2.E1EDK02[1] == undefined || idoc2.E1EDK02[1].DATUM == null || idoc2.E1EDK02[1].DATUM == undefined || idoc2.E1EDK02[1].DATUM.length < 1) {
				args.push("")

			} else {

				console.log("E1EDK01.E1EDK02[1].DATUM = ", idoc2.E1EDK02[1].DATUM)

				args.push(idoc2.E1EDK02[1].DATUM)
			}
			if (idoc2.E1EDK02[2] == null || idoc2.E1EDK02[2] == undefined || idoc2.E1EDK02[2].QUALF == null || idoc2.E1EDK02[2].QUALF == undefined || idoc2.E1EDK02[2].QUALF.length < 1) {
				args.push("")

			} else {

				console.log("E1EDK01.E1EDK02[2].QUALF = ", idoc2.E1EDK02[2].QUALF)

				args.push(idoc2.E1EDK02[2].QUALF)
			}

			if (idoc2.E1EDK02[2] == null || idoc2.E1EDK02[2] == undefined || idoc2.E1EDK02[2].BELNR == null || idoc2.E1EDK02[2].BELNR == undefined || idoc2.E1EDK02[2].BELNR.length < 1) {
				args.push("")

			} else {
				console.log("E1EDK01.E1EDK02[2].BELNR = ", idoc2.E1EDK02[2].BELNR)

				args.push(idoc2.E1EDK02[2].BELNR)
			}

			if (idoc2.E1EDK02[2] == null || idoc2.E1EDK02[2] == undefined || idoc2.E1EDK02[2].DATUM == null || idoc2.E1EDK02[2].DATUM == undefined || idoc2.E1EDK02[2].DATUM.length < 1) {
				args.push("")

			} else {

				console.log("E1EDK01.E1EDK02[1].DATUM = ", idoc2.E1EDK02[2].DATUM)

				args.push(idoc2.E1EDK02[2].DATUM)
			}
			if (idoc2.E1EDK05[0] == null || idoc2.E1EDK05[0] == undefined || idoc2.E1EDK05[0].ALCKZ == null || idoc2.E1EDK05[0].ALCKZ == undefined || idoc2.E1EDK05[0].ALCKZ.length < 1) {
				args.push("")

			} else {

				console.log("E1EDK01.E1EDK05[0].ALCKZ = ", idoc2.E1EDK05[0].ALCKZ)

				args.push(idoc2.E1EDK05[0].ALCKZ)
			}

			if (idoc2.E1EDK05[0] == null || idoc2.E1EDK05[0] == undefined || idoc2.E1EDK05[0].KSCHL == null || idoc2.E1EDK05[0].KSCHL == undefined || idoc2.E1EDK05[0].KSCHL.length < 1) {
				args.push("")

			} else {

				console.log("E1EDK01.E1EDK05[0].KSCHL = ", idoc2.E1EDK05[0].KSCHL)

				args.push(idoc2.E1EDK05[0].KSCHL)
			}

			if (idoc2.E1EDK05[0] == null || idoc2.E1EDK05[0] == undefined || idoc2.E1EDK05[0].BETRG == null || idoc2.E1EDK05[0].BETRG == undefined || idoc2.E1EDK05[0].BETRG.length < 1) {
				args.push("")

			} else {

				console.log("E1EDK01.E1EDK05[0].BETRG = ", idoc2.E1EDK05[0].BETRG)

				args.push(idoc2.E1EDK05[0].BETRG)
			}

			if (idoc2.E1EDK05[0] == null || idoc2.E1EDK05[0] == undefined || idoc2.E1EDK05[0].KOEIN == null || idoc2.E1EDK05[0].KOEIN == undefined || idoc2.E1EDK05[0].KOEIN.length < 1) {
				args.push("")

			} else {

				console.log("E1EDK01.E1EDK05[0].KOEIN = ", idoc2.E1EDK05[0].KOEIN)

				args.push(idoc2.E1EDK05[0].KOEIN)
			}
			/* if (idoc2.E1EDK05[1] == null || idoc2.E1EDK05[1] == undefined || idoc2.E1EDK05[1].ALCKZ == null || idoc2.E1EDK05[1].ALCKZ == undefined || idoc2.E1EDK05[1].ALCKZ.length < 1) {
				args.push("")

			} else {

				console.log("E1EDK01.E1EDK05[1].ALCKZ = ", idoc2.E1EDK05[1].ALCKZ)

				args.push(idoc2.E1EDK05[1].ALCKZ)
			}

			if (idoc.E1EDK05[1] == null || idoc.E1EDK05[1] == undefined || idoc.E1EDK05[1].BETRG == null || idoc.E1EDK05[1].BETRG == undefined || idoc.E1EDK05[1].BETRG.length < 1) {
				args.push("")

			} else {

				console.log("E1EDK01.E1EDK05[1].BETRG = ", idoc.E1EDK05[1].BETRG)

				args.push(idoc.E1EDK05[1].BETRG)
			}
			if (idoc.E1EDK05[1] == null || idoc.E1EDK05[1] == undefined || idoc.E1EDK05[1].KOEIN == null || idoc.E1EDK05[1].KOEIN == undefined || idoc.E1EDK05[1].KOEIN.length < 1) {
				args.push("")

			} else {

				console.log("E1EDK01.E1EDK05[1].KOEIN = ", idoc.E1EDK05[1].KOEIN)

				args.push(idoc.E1EDK05[1].KOEIN)
			} */

			if (idoc2.E1EDK04 == null || idoc2.E1EDK04 == undefined || idoc2.E1EDK04.MWSKZ == null || idoc2.E1EDK04.MWSKZ == undefined || idoc2.E1EDK04.MWSKZ.length < 1) {
				args.push("")

			} else {

				console.log("E1EDK01.E1EDK04.MWSKZ = ", idoc2.E1EDK04.MWSKZ)

				args.push(idoc2.E1EDK04.MWSKZ)
			}

			if (idoc2.E1EDK17[0] == null || idoc2.E1EDK17[0] == undefined || idoc2.E1EDK17[0].QUALF == null || idoc2.E1EDK17[0].QUALF == undefined || idoc2.E1EDK17[0].QUALF.length < 1) {
				args.push("")
			} else {

				console.log("E1EDK01.E1EDK17[0].QUALF = ", idoc2.E1EDK17[0].QUALF)

				args.push(idoc2.E1EDK17[0].QUALF)
			}

			if (idoc2.E1EDK17[0] == null || idoc2.E1EDK17[0] == undefined || idoc2.E1EDK17[0].LKOND == null || idoc2.E1EDK17[0].LKOND == undefined || idoc2.E1EDK17[0].LKOND.length < 1) {
				args.push("")

			} else {

				console.log("E1EDK01.E1EDK17[0].LKOND = ", idoc2.E1EDK17[0].LKOND)

				args.push(idoc2.E1EDK17[0].LKOND)
			}

			if (idoc2.E1EDK17[0] == null || idoc2.E1EDK17[0] == undefined || idoc2.E1EDK17[0].LKTEXT == null || idoc2.E1EDK17[0].LKTEXT == undefined || idoc2.E1EDK17[0].LKTEXT.length < 1) {
				args.push("")

			} else {

				console.log("E1EDK01.E1EDK17[0].LKTEXT = ", idoc2.E1EDK17[0].LKTEXT)

				args.push(idoc2.E1EDK17[0].LKTEXT)
			}
            /*  
			if (idoc.E1EDK17[1] == null || idoc.E1EDK17[1] == undefined || idoc.E1EDK17[1].QUALF == null || idoc.E1EDK17[1].QUALF == undefined || idoc.E1EDK17[1].QUALF.length < 1) {
				args.push("")

			} else {

				console.log("E1EDK01.E1EDK17[1].QUALF = ", idoc.E1EDK17[1].QUALF)

				args.push(idoc.E1EDK17[1].QUALF)
			}

			if (idoc.E1EDK17[1] == null || idoc.E1EDK17[1] == undefined || idoc.E1EDK17[1].LKOND == null || idoc.E1EDK17[1].LKOND == undefined || idoc.E1EDK17[1].LKOND.length < 1) {
				args.push("")

			} else {

				console.log("E1EDK01.E1EDK17[1].LKOND = ", idoc.E1EDK17[1].LKOND)

				args.push(idoc.E1EDK17[1].LKOND)
			}
			if (idoc.E1EDK17[1] == null || idoc.E1EDK17[1] == undefined || idoc.E1EDK17[1].LKTEXT == null || idoc.E1EDK17[1].LKTEXT == undefined || idoc.E1EDK17[1].LKTEXT.length < 1) {
				args.push("")

			} else {

				console.log("E1EDK01.E1EDK17[1].LKTEXT = ", idoc.E1EDK17[1].LKTEXT)

				args.push(idoc.E1EDK17[1].LKTEXT)
			} */

			if (idoc2.E1EDP01 == null || idoc2.E1EDP01 == undefined || idoc2.E1EDP01.POSEX.length < 1) {
				args.push("")

			} else {

				console.log("E1EDK01.E1EDP01.POSEX = ", idoc2.E1EDP01.POSEX)

				args.push(idoc2.E1EDP01.POSEX)
			}

			if (idoc2.E1EDP01 == null || idoc2.E1EDP01 == undefined || idoc2.E1EDP01.MENGE.length < 1) {
				args.push("")

			} else {

				console.log("E1EDK01.E1EDP01.MENGE = ", idoc2.E1EDP01.MENGE)

				args.push(idoc2.E1EDP01.MENGE)
			}

			if (idoc2.E1EDP01 == null || idoc2.E1EDP01 == undefined || idoc2.E1EDP01.MENEE.length < 1) {
				args.push("")

			} else {

				console.log("E1EDK01.E1EDP01.MENEE = ", idoc2.E1EDP01.MENEE)

				args.push(idoc2.E1EDP01.MENEE)
			}

			if (idoc2.E1EDP01 == null || idoc2.E1EDP01 == undefined || idoc2.E1EDP01.NTGEW == null || idoc2.E1EDP01.NTGEW == undefined || idoc2.E1EDP01.NTGEW.length < 1) {
				args.push("")

			} else {

				console.log("E1EDK01.E1EDP01.NTGEW = ", idoc2.E1EDP01.NTGEW)

				args.push(idoc2.E1EDP01.NTGEW)
			}
			if (idoc2.E1EDP01 == null || idoc2.E1EDP01 == undefined || idoc2.E1EDP01.GEWEI == null || idoc2.E1EDP01.GEWEI == undefined || idoc2.E1EDP01.GEWEI.length < 1) {
				args.push("")

			} else {

				console.log("E1EDK01.E1EDP01.GEWEI = ", idoc2.E1EDP01.GEWEI)

				args.push(idoc2.E1EDP01.GEWEI)
			}

			if (idoc2.E1EDP01 == null || idoc2.E1EDP01 == undefined || idoc2.E1EDP01.BRGEW == null || idoc2.E1EDP01.BRGEW == undefined || idoc2.E1EDP01.BRGEW.length < 1) {
				args.push("")

			} else {

				console.log("E1EDK01.E1EDP01.BRGEW = ", idoc2.E1EDP01.BRGEW)

				args.push(idoc2.E1EDP01.BRGEW)
			}

			if (idoc2.E1EDP01 == null || idoc2.E1EDP01 == undefined || idoc2.E1EDP01.WERKS == null || idoc2.E1EDP01.WERKS == undefined || idoc2.E1EDP01.WERKS.length < 1) {
				args.push("")

			} else {

				console.log("E1EDK01.E1EDP01.WERKS = ", idoc2.E1EDP01.WERKS)

				args.push(idoc2.E1EDP01.WERKS)
			}

			if (idoc2.E1EDP01.Z1EDP01 == null || idoc2.E1EDP01.Z1EDP01 == undefined || idoc2.E1EDP01.Z1EDP01.VOLEH == null || idoc2.E1EDP01.Z1EDP01.VOLEH == undefined || idoc2.E1EDP01.Z1EDP01.VOLEH.length < 1) {
				args.push("")

			} else {

				console.log("EK01.E1EDP01.Z1EDP01.VOLEH = ", idoc2.E1EDP01.Z1EDP01.VOLEH)

				args.push(idoc2.E1EDP01.Z1EDP01.VOLEH)
			}

			if (idoc2.E1EDP01.Z1EDP01 == null || idoc2.E1EDP01.Z1EDP01 == undefined || idoc2.E1EDP01.Z1EDP01.BTVOL == null || idoc2.E1EDP01.Z1EDP01.BTVOL == undefined || idoc2.E1EDP01.Z1EDP01.BTVOL.length < 1) {
				args.push("")

			} else {

				console.log("EK01.E1EDP01.Z1EDP01.BTVOL = ", idoc2.E1EDP01.Z1EDP01.BTVOL)

				args.push(idoc2.E1EDP01.Z1EDP01.BTVOL)
			}

			if (idoc2.E1EDP01.E1EDP02 == null || idoc2.E1EDP01.E1EDP02 == undefined || idoc2.E1EDP01.E1EDP02.QUALF == null || idoc2.E1EDP01.E1EDP02.QUALF == undefined || idoc2.E1EDP01.E1EDP02.QUALF.length < 1) {
				args.push("")

			} else {

				console.log("EK01.E1EDP01.E1EDP02.QUALF = ", idoc2.E1EDP01.E1EDP02.QUALF)

				args.push(idoc2.E1EDP01.E1EDP02.QUALF)
			}
			if (idoc2.E1EDP01.E1EDP02 === null || idoc2.E1EDP01.E1EDP02 == undefined || idoc2.E1EDP01.E1EDP02.BELNR === null || idoc2.E1EDP01.E1EDP02.BELNR == undefined || idoc2.E1EDP01.E1EDP02.BELNR.length < 1) {
				args.push("")

			} else {

				console.log("EK01.E1EDP01.E1EDP02.BELNR = ", idoc2.E1EDP01.E1EDP02.BELNR)

				args.push(idoc2.E1EDP01.E1EDP02.BELNR)
			}

			if (idoc2.E1EDP01.E1EDP02 == null || idoc2.E1EDP01.E1EDP02 == undefined || idoc2.E1EDP01.E1EDP02.ZEILE == null || idoc2.E1EDP01.E1EDP02.ZEILE == undefined || idoc2.E1EDP01.E1EDP02.ZEILE.length < 1) {
				args.push("")

			} else {

				console.log("EK01.E1EDP01.E1EDP02.ZEILE = ", idoc2.E1EDP01.E1EDP02.ZEILE)

				args.push(idoc2.E1EDP01.E1EDP02.ZEILE)
			}
			if (idoc2.E1EDP01.E1EDP26 == null || idoc2.E1EDP01.E1EDP26 == undefined || idoc2.E1EDP01.E1EDP26.QUALF == null || idoc2.E1EDP01.E1EDP26.QUALF == undefined || idoc2.E1EDP01.E1EDP26.QUALF.length < 1) {
				args.push("")

			} else {

				console.log("EK01.E1EDP01.E1EDP26.QUALF = ", idoc2.E1EDP01.E1EDP26.QUALF)
				args.push(idoc2.E1EDP01.E1EDP26.QUALF)
			}
			if (idoc2.E1EDP01.E1EDP26 == null || idoc2.E1EDP01.E1EDP26 == undefined || idoc2.E1EDP01.E1EDP26.BETRG == null || idoc2.E1EDP01.E1EDP26.BETRG == undefined || idoc2.E1EDP01.E1EDP26.BETRG.length < 1) {
				args.push("")

			} else {

				console.log(" EK01.E1EDP01.E1EDP26.BETRG = ", idoc2.E1EDP01.E1EDP26.BETRG)
				args.push(idoc2.E1EDP01.E1EDP26.BETRG)
			}

			if (idoc2.E1EDP01.E1EDP05 == null || idoc2.E1EDP01.E1EDP05 == undefined || idoc2.E1EDP01.E1EDP05.ALCKZ == null || idoc2.E1EDP01.E1EDP05.ALCKZ == undefined || idoc2.E1EDP01.E1EDP05.ALCKZ.length < 1) {
				args.push("")

			} else {

				console.log("EK01.E1EDP01.E1EDP05.ALCKZ = ", idoc2.E1EDP01.E1EDP05.ALCKZ)
				args.push(idoc2.E1EDP01.E1EDP05.ALCKZ)
			}

			if (idoc2.E1EDP01.E1EDP05 == null || idoc2.E1EDP01.E1EDP05 == undefined || idoc2.E1EDP01.E1EDP05.KSCHL == null || idoc2.E1EDP01.E1EDP05.KSCHL == undefined || idoc2.E1EDP01.E1EDP05.KSCHL.length < 1) {
				args.push("")

			} else {
				console.log("EK01.E1EDP01.E1EDP05.KSCHL = ", idoc2.E1EDP01.E1EDP05.KSCHL)
				args.push(idoc2.E1EDP01.E1EDP05.KSCHL)

			}

			if (idoc2.E1EDP01.E1EDP05 == null || idoc2.E1EDP01.E1EDP05 === undefined || idoc2.E1EDP01.E1EDP05.BETRG == null || idoc2.E1EDP01.E1EDP05.BETRG === undefined || idoc2.E1EDP01.E1EDP05.BETRG.length < 1) {
				args.push("")
			} else {

				console.log("EK01.E1EDP01.E1EDP05.BETRG = ", idoc2.E1EDP01.E1EDP05.BETRG)
				args.push(idoc2.E1EDP01.E1EDP05.BETRG)

			}
			if (idoc2.E1EDP01.E1EDP04 == null || idoc2.E1EDP01.E1EDP04 == undefined || idoc2.E1EDP01.E1EDP04.MWSKZ == null || idoc2.E1EDP01.E1EDP04.MWSKZ == undefined || idoc2.E1EDP01.E1EDP04.MWSKZ.length < 1) {
				args.push("")
			} else {

				console.log("EK01.E1EDP01.E1EDP04.MWSKZ = ", idoc2.E1EDP01.E1EDP04.MWSKZ)
				args.push(idoc2.E1EDP01.E1EDP04.MWSKZ)

			}
			//Demo2 starts	E1EDP19
			if (idoc2.E1EDP01.E1EDP19 == null || idoc2.E1EDP01.E1EDP19 == undefined || idoc2.E1EDP01.E1EDP19.QUALF == null || idoc2.E1EDP01.E1EDP19.QUALF == undefined || idoc2.E1EDP01.E1EDP19.QUALF.length < 1) {
				args.push("")
			} else {

				console.log("EK01.E1EDP01.E1EDP19.QUALF = ", idoc2.E1EDP01.E1EDP19.QUALF)
				args.push(idoc2.E1EDP01.E1EDP19.QUALF)
			}
			if (idoc2.E1EDP01.E1EDP19 == null || idoc2.E1EDP01.E1EDP19 == undefined || idoc2.E1EDP01.E1EDP19.IDTNR == null || idoc2.E1EDP01.E1EDP19.IDTNR == undefined || idoc2.E1EDP01.E1EDP19.IDTNR.length < 1) {
				args.push("")
			} else {

				console.log("EK01.E1EDP01.E1EDP19.IDTNR = ", idoc2.E1EDP01.E1EDP19.IDTNR)
				args.push(idoc2.E1EDP01.E1EDP19.IDTNR)
			}
			//Demo2 ends
			//Adding Date Field
			var today = new Date();
			var dd = String(today.getDate()).padStart(2, '0');
			var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0 !
			var yyyy = today.getFullYear();

			let todayString = yyyy + '-' + mm + '-' + dd;


			console.log("TODAY ===== ", todayString)
			var day2 = new Date(yyyy, mm, dd)
			//today = "12-05-2019"
			//var unix = Math.round((new Date(today)) / 1000); 
			var unix = Math.floor(day2 / 1000);
			console.log("TODAY's UNIX DATE === ", unix)
			args.push(unix.toString())
			console.log(args);
			console.log("Length of args    ", args.length)

			console.log("==========Length == ", args.length)
			var message = await invoke.invokeChaincode(peers, channelName, chaincodeName, fcn, args, username, orgName);
			console.log("******************** Invoice Response Created Successfully ***********************")
			//res.send(message) 

			//Demo2 starts- sending DAP invoice details to FIL //
			console.log(" Invoice Data == ", req.body);
			// Adding the exchange rate
			var temp = req.body;
			temp.ZEXPINV4_IV01.IDOC.E1EDK01.CURCY = fs.EURUSD.LCY
			temp.ZEXPINV4_IV01.IDOC.E1EDK01.HWAER = fs.EURUSD.CCY
			temp.ZEXPINV4_IV01.IDOC.E1EDK01.WKURS = fs.EURUSD.RTE

			console.log(temp.ZEXPINV4_IV01.IDOC.E1EDK01.CURCY)
			console.log(temp.ZEXPINV4_IV01.IDOC.E1EDK01.HWAER)
			console.log(temp.ZEXPINV4_IV01.IDOC.E1EDK01.WKURS)
			let invoiceResponseFil = await invoiceCreation.invokeInvoiceCreationFil(temp);
			console.log("Invoice Message == ", invoiceResponseFil)
			let response = message.message + " and " + invoiceResponseFil
			res.send(response)
			//Demo2 ends
		}
	} catch (e) {
		console.log("Expection occured ", e)
		res.status(500);
		res.send(e)
	}
});

//

// Fil invoice

app.post('/channels/FilInvoice', async function (req, res) {
	logger.debug('==================== INVOKE FilInvoiceResponse ON CHAINCODE ==================');
	try {

		console.log("Req == ", req.body)
		var args = [];
		var peers = "peer0.org1.example.com"
		var channelName = "mychannel"
		var chaincodeName = "mycc3"
		var username = "Jim"
		var orgName = "Org1"
		var fcn = "createFilInvoice"
		var Inv = req.body.ZINVOIC02;
		var pilinv = req.body;
		if (Inv === undefined || Inv === null || Inv.length < 1) {
			res.status(500);
			res.json("Invalid Arguments");
		}
		else {

			var Idoc = req.body.ZINVOIC02.IDOC;
			if (Idoc === undefined || Idoc === null || Idoc.length < 1) {
				res.status(500);
				res.json("Invalid Arguments ");
			}
			else {
				//E1EDK01
				if (Idoc.E1EDK01 == null || Idoc.E1EDK01 === undefined || Idoc.E1EDK01.length < 1 || Idoc.E1EDK01.CURCY == null || Idoc.E1EDK01.CURCY === undefined || Idoc.E1EDK01.CURCY.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDK01.CURCY = ", Idoc.E1EDK01.CURCY)
					args.push(Idoc.E1EDK01.CURCY)
				}
				if (Idoc.E1EDK01 == null || Idoc.E1EDK01 === undefined || Idoc.E1EDK01.length < 1 || Idoc.E1EDK01.HWAER == null || Idoc.E1EDK01.HWAER === undefined || Idoc.E1EDK01.HWAER.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDK01.HWAER = ", Idoc.E1EDK01.HWAER)
					args.push(Idoc.E1EDK01.HWAER)
				}
				if (Idoc.E1EDK01 == null || Idoc.E1EDK01 === undefined || Idoc.E1EDK01.length < 1 || Idoc.E1EDK01.WKURS == null || Idoc.E1EDK01.WKURS === undefined || Idoc.E1EDK01.WKURS.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDK01.WKURS = ", Idoc.E1EDK01.WKURS)
					args.push(Idoc.E1EDK01.WKURS)
				}
				if (Idoc.E1EDK01 == null || Idoc.E1EDK01 === undefined || Idoc.E1EDK01.length < 1 || Idoc.E1EDK01.ZTERM == null || Idoc.E1EDK01.ZTERM === undefined || Idoc.E1EDK01.ZTERM.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDK01.ZTERM = ", Idoc.E1EDK01.ZTERM)
					args.push(Idoc.E1EDK01.ZTERM)
				}
				if (Idoc.E1EDK01 == null || Idoc.E1EDK01 === undefined || Idoc.E1EDK01.length < 1 || Idoc.E1EDK01.EIGENUINR == null || Idoc.E1EDK01.EIGENUINR === undefined || Idoc.E1EDK01.EIGENUINR.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDK01.EIGENUINR = ", Idoc.E1EDK01.EIGENUINR)
					args.push(Idoc.E1EDK01.EIGENUINR)
				}
				if (Idoc.E1EDK01 == null || Idoc.E1EDK01 === undefined || Idoc.E1EDK01.length < 1 || Idoc.E1EDK01.BSART == null || Idoc.E1EDK01.BSART === undefined || Idoc.E1EDK01.BSART.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDK01.BSART = ", Idoc.E1EDK01.BSART)
					args.push(Idoc.E1EDK01.BSART)
				}
				if (Idoc.E1EDK01 == null || Idoc.E1EDK01 === undefined || Idoc.E1EDK01.length < 1 || Idoc.E1EDK01.BELNR == null || Idoc.E1EDK01.BELNR === undefined || Idoc.E1EDK01.BELNR.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDK01.BELNR = ", Idoc.E1EDK01.BELNR)
					args.push(Idoc.E1EDK01.BELNR)
				}
				if (Idoc.E1EDK01 == null || Idoc.E1EDK01 === undefined || Idoc.E1EDK01.length < 1 || Idoc.E1EDK01.NTGEW == null || Idoc.E1EDK01.NTGEW === undefined || Idoc.E1EDK01.NTGEW.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDK01.NTGEW = ", Idoc.E1EDK01.NTGEW)
					args.push(Idoc.E1EDK01.NTGEW)
				}
				if (Idoc.E1EDK01 == null || Idoc.E1EDK01 === undefined || Idoc.E1EDK01.length < 1 || Idoc.E1EDK01.BRGEW == null || Idoc.E1EDK01.BRGEW === undefined || Idoc.E1EDK01.BRGEW.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDK01.BRGEW = ", Idoc.E1EDK01.BRGEW)
					args.push(Idoc.E1EDK01.BRGEW)
				}
				if (Idoc.E1EDK01 == null || Idoc.E1EDK01 === undefined || Idoc.E1EDK01.length < 1 || Idoc.E1EDK01.GEWEI == null || Idoc.E1EDK01.GEWEI === undefined || Idoc.E1EDK01.GEWEI.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDK01.GEWEI = ", Idoc.E1EDK01.GEWEI)
					args.push(Idoc.E1EDK01.GEWEI)
				}
				if (Idoc.E1EDK01 == null || Idoc.E1EDK01 === undefined || Idoc.E1EDK01.length < 1 || Idoc.E1EDK01.FKART_RL == null || Idoc.E1EDK01.FKART_RL === undefined || Idoc.E1EDK01.FKART_RL.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDK01.FKART_RL = ", Idoc.E1EDK01.FKART_RL)
					args.push(Idoc.E1EDK01.FKART_RL)
				}

				if (Idoc.E1EDK01 == null || Idoc.E1EDK01 === undefined || Idoc.E1EDK01.length < 1 || Idoc.E1EDK01.RECIPNT_NO == null || Idoc.E1EDK01.RECIPNT_NO === undefined || Idoc.E1EDK01.RECIPNT_NO.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDK01.RECIPNT_NO  = ", Idoc.E1EDK01.RECIPNT_NO)
					args.push(Idoc.E1EDK01.RECIPNT_NO)
				}
				if (Idoc.E1EDK01 == null || Idoc.E1EDK01 === undefined || Idoc.E1EDK01.length < 1 || Idoc.E1EDK01.FKTYP == null || Idoc.E1EDK01.FKTYP === undefined || Idoc.E1EDK01.FKTYP.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDK01.FKTYP = ", Idoc.E1EDK01.FKTYP)
					args.push(Idoc.E1EDK01.FKTYP)
				}

				//E1EDKA1
				if (Idoc.E1EDKA1 == null || Idoc.E1EDKA1 === undefined || Idoc.E1EDKA1.length < 1 || Idoc.E1EDKA1[0].PARVW == null || Idoc.E1EDKA1[0].PARVW === undefined || Idoc.E1EDKA1[0].PARVW.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDKA1.PARVW = ", Idoc.E1EDKA1[0].PARVW)
					args.push(Idoc.E1EDKA1[0].PARVW)
				}
				if (Idoc.E1EDKA1 == null || Idoc.E1EDKA1 === undefined || Idoc.E1EDKA1.length < 1 || Idoc.E1EDKA1[0].PARTN == null || Idoc.E1EDKA1[0].PARTN === undefined || Idoc.E1EDKA1[0].PARTN.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDKA1.PARTN  = ", Idoc.E1EDKA1[0].PARTN)
					args.push(Idoc.E1EDKA1[0].PARTN)
				}
				if (Idoc.E1EDKA1 == null || Idoc.E1EDKA1 === undefined || Idoc.E1EDKA1.length < 1 || Idoc.E1EDKA1[0].LIFNR == null || Idoc.E1EDKA1[0].LIFNR === undefined || Idoc.E1EDKA1[0].LIFNR.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDKA1.LIFNR = ", Idoc.E1EDKA1[0].LIFNR)
					args.push(Idoc.E1EDKA1[0].LIFNR)
				}
				if (Idoc.E1EDKA1 == null || Idoc.E1EDKA1 === undefined || Idoc.E1EDKA1.length < 1 || Idoc.E1EDKA1[0].NAME1 == null || Idoc.E1EDKA1[0].NAME1 === undefined || Idoc.E1EDKA1[0].NAME1.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDKA1.NAME1 = ", Idoc.E1EDKA1[0].NAME1)
					args.push(Idoc.E1EDKA1[0].NAME1)
				}
				if (Idoc.E1EDKA1 == null || Idoc.E1EDKA1 === undefined || Idoc.E1EDKA1.length < 1 || Idoc.E1EDKA1[0].NAME2 == null || Idoc.E1EDKA1[0].NAME2 === undefined || Idoc.E1EDKA1[0].NAME2.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDKA1.NAME2 = ", Idoc.E1EDKA1[0].NAME2)
					args.push(Idoc.E1EDKA1[0].NAME2)
				}
				if (Idoc.E1EDKA1 == null || Idoc.E1EDKA1 === undefined || Idoc.E1EDKA1.length < 1 || Idoc.E1EDKA1[0].STRAS == null || Idoc.E1EDKA1[0].STRAS === undefined || Idoc.E1EDKA1[0].STRAS.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDKA1.STRAS = ", Idoc.E1EDKA1[0].STRAS)
					args.push(Idoc.E1EDKA1[0].STRAS)
				}
				if (Idoc.E1EDKA1 == null || Idoc.E1EDKA1 === undefined || Idoc.E1EDKA1.length < 1 || Idoc.E1EDKA1[0].PFACH == null || Idoc.E1EDKA1[0].PFACH === undefined || Idoc.E1EDKA1[0].PFACH.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDKA1.PFACH = ", Idoc.E1EDKA1[0].PFACH)
					args.push(Idoc.E1EDKA1[0].PFACH)
				}
				if (Idoc.E1EDKA1 == null || Idoc.E1EDKA1 === undefined || Idoc.E1EDKA1.length < 1 || Idoc.E1EDKA1[0].ORT01 == null || Idoc.E1EDKA1[0].ORT01 === undefined || Idoc.E1EDKA1[0].ORT01.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDKA1.ORT01 = ", Idoc.E1EDKA1[0].ORT01)
					args.push(Idoc.E1EDKA1[0].ORT01)
				}
				if (Idoc.E1EDKA1 == null || Idoc.E1EDKA1 === undefined || Idoc.E1EDKA1.length < 1 || Idoc.E1EDKA1[0].PSTLZ == null || Idoc.E1EDKA1[0].PSTLZ === undefined || Idoc.E1EDKA1[0].PSTLZ.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDKA1.PSTLZ = ", Idoc.E1EDKA1[0].PSTLZ)
					args.push(Idoc.E1EDKA1[0].PSTLZ)
				}
				if (Idoc.E1EDKA1 == null || Idoc.E1EDKA1 === undefined || Idoc.E1EDKA1.length < 1 || Idoc.E1EDKA1[0].PSTL2 == null || Idoc.E1EDKA1[0].PSTL2 === undefined || Idoc.E1EDKA1[0].PSTL2.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDKA1.PSTL2 = ", Idoc.E1EDKA1[0].PSTL2)
					args.push(Idoc.E1EDKA1[0].PSTL2)
				}
				if (Idoc.E1EDKA1 == null || Idoc.E1EDKA1 === undefined || Idoc.E1EDKA1.length < 1 || Idoc.E1EDKA1[0].LAND1 == null || Idoc.E1EDKA1[0].LAND1 === undefined || Idoc.E1EDKA1[0].LAND1.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDKA1.LAND1 = ", Idoc.E1EDKA1[0].LAND1)
					args.push(Idoc.E1EDKA1[0].LAND1)
				}
				if (Idoc.E1EDKA1 == null || Idoc.E1EDKA1 === undefined || Idoc.E1EDKA1.length < 1 || Idoc.E1EDKA1[0].SPRAS == null || Idoc.E1EDKA1[0].SPRAS === undefined || Idoc.E1EDKA1[0].SPRAS.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDKA1.SPRAS = ", Idoc.E1EDKA1[0].SPRAS)
					args.push(Idoc.E1EDKA1[0].SPRAS)
				}
				if (Idoc.E1EDKA1 == null || Idoc.E1EDKA1 === undefined || Idoc.E1EDKA1.length < 1 || Idoc.E1EDKA1[0].BNAME == null || Idoc.E1EDKA1[0].BNAME === undefined || Idoc.E1EDKA1[0].BNAME.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDKA1.BNAME = ", Idoc.E1EDKA1[0].BNAME)
					args.push(Idoc.E1EDKA1[0].BNAME)
				}
				if (Idoc.E1EDKA1 == null || Idoc.E1EDKA1 === undefined || Idoc.E1EDKA1.length < 1 || Idoc.E1EDKA1[0].PAORG == null || Idoc.E1EDKA1[0].PAORG === undefined || Idoc.E1EDKA1[0].PAORG.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDKA1.PAORG = ", Idoc.E1EDKA1[0].PAORG)
					args.push(Idoc.E1EDKA1[0].PAORG)
				}


				if (Idoc.E1EDKA1 == null || Idoc.E1EDKA1 === undefined || Idoc.E1EDKA1.length < 1 || Idoc.E1EDKA1[1].PARVW == null || Idoc.E1EDKA1[1].PARVW === undefined || Idoc.E1EDKA1[1].PARVW.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDKA1.PARVW = ", Idoc.E1EDKA1[1].PARVW)
					args.push(Idoc.E1EDKA1[0].PARVW)
				}
				if (Idoc.E1EDKA1 == null || Idoc.E1EDKA1 === undefined || Idoc.E1EDKA1.length < 1 || Idoc.E1EDKA1[1].PARTN == null || Idoc.E1EDKA1[1].PARTN === undefined || Idoc.E1EDKA1[1].PARTN.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDKA1.PARTN  = ", Idoc.E1EDKA1[1].PARTN)
					args.push(Idoc.E1EDKA1[1].PARTN)
				}
				if (Idoc.E1EDKA1 == null || Idoc.E1EDKA1 === undefined || Idoc.E1EDKA1.length < 1 || Idoc.E1EDKA1[1].LIFNR == null || Idoc.E1EDKA1[1].LIFNR === undefined || Idoc.E1EDKA1[1].LIFNR.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDKA1.LIFNR = ", Idoc.E1EDKA1[1].LIFNR)
					args.push(Idoc.E1EDKA1[1].LIFNR)
				}
				if (Idoc.E1EDKA1 == null || Idoc.E1EDKA1 === undefined || Idoc.E1EDKA1.length < 1 || Idoc.E1EDKA1[1].NAME1 == null || Idoc.E1EDKA1[1].NAME1 === undefined || Idoc.E1EDKA1[1].NAME1.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDKA1.NAME1 = ", Idoc.E1EDKA1[1].NAME1)
					args.push(Idoc.E1EDKA1[1].NAME1)
				}
				if (Idoc.E1EDKA1 == null || Idoc.E1EDKA1 === undefined || Idoc.E1EDKA1.length < 1 || Idoc.E1EDKA1[1].NAME2 == null || Idoc.E1EDKA1[1].NAME2 === undefined || Idoc.E1EDKA1[1].NAME2.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDKA1.NAME2 = ", Idoc.E1EDKA1[1].NAME2)
					args.push(Idoc.E1EDKA1[1].NAME2)
				}
				if (Idoc.E1EDKA1 == null || Idoc.E1EDKA1 === undefined || Idoc.E1EDKA1.length < 1 || Idoc.E1EDKA1[1].STRAS == null || Idoc.E1EDKA1[1].STRAS === undefined || Idoc.E1EDKA1[1].STRAS.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDKA1.STRAS = ", Idoc.E1EDKA1[1].STRAS)
					args.push(Idoc.E1EDKA1[1].STRAS)
				}
				if (Idoc.E1EDKA1 == null || Idoc.E1EDKA1 === undefined || Idoc.E1EDKA1.length < 1 || Idoc.E1EDKA1[1].PFACH == null || Idoc.E1EDKA1[1].PFACH === undefined || Idoc.E1EDKA1[1].PFACH.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDKA1.PFACH = ", Idoc.E1EDKA1[1].PFACH)
					args.push(Idoc.E1EDKA1[1].PFACH)
				}
				if (Idoc.E1EDKA1 == null || Idoc.E1EDKA1 === undefined || Idoc.E1EDKA1.length < 1 || Idoc.E1EDKA1[1].ORT01 == null || Idoc.E1EDKA1[1].ORT01 === undefined || Idoc.E1EDKA1[1].ORT01.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDKA1.ORT01 = ", Idoc.E1EDKA1[1].ORT01)
					args.push(Idoc.E1EDKA1[1].ORT01)
				}
				if (Idoc.E1EDKA1 == null || Idoc.E1EDKA1 === undefined || Idoc.E1EDKA1.length < 1 || Idoc.E1EDKA1[1].PSTLZ == null || Idoc.E1EDKA1[1].PSTLZ === undefined || Idoc.E1EDKA1[1].PSTLZ.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDKA1.PSTLZ = ", Idoc.E1EDKA1[1].PSTLZ)
					args.push(Idoc.E1EDKA1[1].PSTLZ)
				}
				if (Idoc.E1EDKA1 == null || Idoc.E1EDKA1 === undefined || Idoc.E1EDKA1.length < 1 || Idoc.E1EDKA1[1].PSTL2 == null || Idoc.E1EDKA1[1].PSTL2 === undefined || Idoc.E1EDKA1[1].PSTL2.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDKA1.PSTL2 = ", Idoc.E1EDKA1[1].PSTL2)
					args.push(Idoc.E1EDKA1[1].PSTL2)
				}
				if (Idoc.E1EDKA1 == null || Idoc.E1EDKA1 === undefined || Idoc.E1EDKA1.length < 1 || Idoc.E1EDKA1[1].LAND1 == null || Idoc.E1EDKA1[1].LAND1 === undefined || Idoc.E1EDKA1[1].LAND1.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDKA1.LAND1 = ", Idoc.E1EDKA1[1].LAND1)
					args.push(Idoc.E1EDKA1[1].LAND1)
				}
				if (Idoc.E1EDKA1 == null || Idoc.E1EDKA1 === undefined || Idoc.E1EDKA1.length < 1 || Idoc.E1EDKA1[1].SPRAS == null || Idoc.E1EDKA1[1].SPRAS === undefined || Idoc.E1EDKA1[1].SPRAS.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDKA1.SPRAS = ", Idoc.E1EDKA1[1].SPRAS)
					args.push(Idoc.E1EDKA1[1].SPRAS)
				}
				if (Idoc.E1EDKA1 == null || Idoc.E1EDKA1 === undefined || Idoc.E1EDKA1.length < 1 || Idoc.E1EDKA1[1].ORT02 == null || Idoc.E1EDKA1[1].ORT02 === undefined || Idoc.E1EDKA1[1].ORT02.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDKA1.ORT02 = ", Idoc.E1EDKA1[1].ORT02)
					args.push(Idoc.E1EDKA1[1].ORT02)
				}
				if (Idoc.E1EDKA1 == null || Idoc.E1EDKA1 === undefined || Idoc.E1EDKA1.length < 1 || Idoc.E1EDKA1[1].REGIO == null || Idoc.E1EDKA1[1].REGIO === undefined || Idoc.E1EDKA1[1].REGIO.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDKA1.REGIO = ", Idoc.E1EDKA1[1].REGIO)
					args.push(Idoc.E1EDKA1[1].REGIO)
				}
				if (Idoc.E1EDKA1 == null || Idoc.E1EDKA1 === undefined || Idoc.E1EDKA1.length < 1 || Idoc.E1EDKA1[1].IHREZ == null || Idoc.E1EDKA1[1].IHREZ === undefined || Idoc.E1EDKA1[1].IHREZ.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDKA1.IHREZ = ", Idoc.E1EDKA1[1].IHREZ)
					args.push(Idoc.E1EDKA1[1].IHREZ)
				}
				if (Idoc.E1EDKA1 == null || Idoc.E1EDKA1 === undefined || Idoc.E1EDKA1.length < 1 || Idoc.E1EDKA1[1].ILNNR == null || Idoc.E1EDKA1[1].ILNNR === undefined || Idoc.E1EDKA1[1].ILNNR.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDKA1.ILNNR = ", Idoc.E1EDKA1[1].ILNNR)
					args.push(Idoc.E1EDKA1[1].ILNNR)
				}
				if (Idoc.E1EDKA1 == null || Idoc.E1EDKA1 === undefined || Idoc.E1EDKA1.length < 1 || Idoc.E1EDKA1[1].SPRAS_ISO == null || Idoc.E1EDKA1[1].SPRAS_ISO === undefined || Idoc.E1EDKA1[1].SPRAS_ISO.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDKA1.SPRAS_ISO = ", Idoc.E1EDKA1[1].SPRAS_ISO)
					args.push(Idoc.E1EDKA1[1].SPRAS_ISO)
				}

				//E1EDK02
				if (Idoc.E1EDK02 == null || Idoc.E1EDK02 === undefined || Idoc.E1EDK02.length < 1 || Idoc.E1EDK02[0].QUALF == null || Idoc.E1EDK02[0].QUALF === undefined || Idoc.E1EDK02[0].QUALF.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDK02.QUALF = ", Idoc.E1EDK02[0].QUALF)
					args.push(Idoc.E1EDK02[0].QUALF)
				}
				if (Idoc.E1EDK02 == null || Idoc.E1EDK02 === undefined || Idoc.E1EDK02.length < 1 || Idoc.E1EDK02[0].BELNR == null || Idoc.E1EDK02[0].BELNR === undefined || Idoc.E1EDK02[0].BELNR.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDK02.BELNR = ", Idoc.E1EDK02[0].BELNR)
					args.push(Idoc.E1EDK02[0].BELNR)
				}
				if (Idoc.E1EDK02 == null || Idoc.E1EDK02 === undefined || Idoc.E1EDK02.length < 1 || Idoc.E1EDK02[0].DATUM == null || Idoc.E1EDK02[0].DATUM === undefined || Idoc.E1EDK02[0].DATUM.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDK02.DATUM = ", Idoc.E1EDK02[0].DATUM)
					args.push(Idoc.E1EDK02[0].DATUM)
				}

				//E1EDK17
				if (Idoc.E1EDK17 == null || Idoc.E1EDK17 === undefined || Idoc.E1EDK17.length < 1 || Idoc.E1EDK17[0].QUALF == null || Idoc.E1EDK17[0].QUALF === undefined || Idoc.E1EDK17[0].QUALF.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDK17.QUALF = ", Idoc.E1EDK17[0].QUALF)
					args.push(Idoc.E1EDK17[0].QUALF)
				}

				if (Idoc.E1EDK17 == null || Idoc.E1EDK17 === undefined || Idoc.E1EDK17.length < 1 || Idoc.E1EDK17[0].LKOND == null || Idoc.E1EDK17[0].LKOND === undefined || Idoc.E1EDK17[0].LKOND.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDK17.LKOND = ", Idoc.E1EDK17[0].LKOND)
					args.push(Idoc.E1EDK17[0].LKOND)
				}

				if (Idoc.E1EDK17 == null || Idoc.E1EDK17 === undefined || Idoc.E1EDK17.length < 1 || Idoc.E1EDK17.LKTEXT == null || Idoc.E1EDK17[0].LKTEXT === undefined || Idoc.E1EDK17[0].LKTEXT.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDK17.LKTEXT = ", Idoc.E1EDK17[0].LKTEXT)
					args.push(Idoc.E1EDK17[0].LKTEXT)
				}

				//E1EDK18
				if (Idoc.E1EDK18 == null || Idoc.E1EDK18 === undefined || Idoc.E1EDK18.length < 1 || Idoc.E1EDK18[0].QUALF == null || Idoc.E1EDK18[0].QUALF === undefined || Idoc.E1EDK18[0].QUALF.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDK18.QUALF = ", Idoc.E1EDK18[0].QUALF)
					args.push(Idoc.E1EDK18[0].QUALF)
				}
				if (Idoc.E1EDK18 == null || Idoc.E1EDK18 === undefined || Idoc.E1EDK18.length < 1 || Idoc.E1EDK18[0].TAGE == null || Idoc.E1EDK18[0].TAGE === undefined || Idoc.E1EDK18[0].TAGE.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDK18.TAGE = ", Idoc.E1EDK18[0].TAGE)
					args.push(Idoc.E1EDK18[0].TAGE)
				}
				if (Idoc.E1EDK18 == null || Idoc.E1EDK18 === undefined || Idoc.E1EDK18.length < 1 || Idoc.E1EDK18[0].PRZNT == null || Idoc.E1EDK18[0].PRZNT === undefined || Idoc.E1EDK18[0].PRZNT.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDK18.PRZNT = ", Idoc.E1EDK18[0].PRZNT)
					args.push(Idoc.E1EDK18[0].PRZNT)
				}
				if (Idoc.E1EDK18 == null || Idoc.E1EDK18 === undefined || Idoc.E1EDK18.length < 1 || Idoc.E1EDK18[0].ZTERM_TXT == null || Idoc.E1EDK18[0].ZTERM_TXT === undefined || Idoc.E1EDK18[0].ZTERM_TXT.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDK18.ZTERM_TXT = ", Idoc.E1EDK18[0].ZTERM_TXT)
					args.push(Idoc.E1EDK18[0].ZTERM_TXT)
				}
				if (Idoc.E1EDK18 == null || Idoc.E1EDK18 === undefined || Idoc.E1EDK18.length < 1 || Idoc.E1EDK18[1].QUALF == null || Idoc.E1EDK18[1].QUALF === undefined || Idoc.E1EDK18[1].QUALF.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDK18.QUALF = ", Idoc.E1EDK18[1].QUALF)
					args.push(Idoc.E1EDK18[1].QUALF)
				}
				if (Idoc.E1EDK18 == null || Idoc.E1EDK18 === undefined || Idoc.E1EDK18.length < 1 || Idoc.E1EDK18[1].ZTERM_TXT == null || Idoc.E1EDK18[1].ZTERM_TXT === undefined || Idoc.E1EDK18[1].ZTERM_TXT.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDK18.ZTERM_TXT = ", Idoc.E1EDK18[1].ZTERM_TXT)
					args.push(Idoc.E1EDK18[1].ZTERM_TXT)
				}

				//E1EDP01
				if (Idoc.E1EDP01 == null || Idoc.E1EDP01 === undefined || Idoc.E1EDP01.length < 1 || Idoc.E1EDP01[0].POSEX == null || Idoc.E1EDP01[0].POSEX === undefined || Idoc.E1EDP01[0].POSEX.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDP01.POSEX = ", Idoc.E1EDP01[0].POSEX)
					args.push(Idoc.E1EDP01[0].POSEX)
				}

				if (Idoc.E1EDP01 == null || Idoc.E1EDP01 === undefined || Idoc.E1EDP01.length < 1 || Idoc.E1EDP01[0].MENGE == null || Idoc.E1EDP01[0].MENGE === undefined || Idoc.E1EDP01[0].MENGE.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDP01.MENGE  = ", Idoc.E1EDP01[0].MENGE)
					args.push(Idoc.E1EDP01[0].MENGE)
				}

				if (Idoc.E1EDP01 == null || Idoc.E1EDP01 === undefined || Idoc.E1EDP01.length < 1 || Idoc.E1EDP01[0].MENEE == null || Idoc.E1EDP01[0].MENEE === undefined || Idoc.E1EDP01[0].MENEE.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDP01.MENEE =  ", Idoc.E1EDP01[0].MENEE)
					args.push(Idoc.E1EDP01[0].MENEE)
				}
				if (Idoc.E1EDP01 == null || Idoc.E1EDP01 === undefined || Idoc.E1EDP01.length < 1 || Idoc.E1EDP01[0].NTGEW == null || Idoc.E1EDP01[0].NTGEW === undefined || Idoc.E1EDP01[0].NTGEW.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDP01.NTGEW =  ", Idoc.E1EDP01[0].NTGEW)
					args.push(Idoc.E1EDP01[0].NTGEW)
				}
				if (Idoc.E1EDP01 == null || Idoc.E1EDP01 === undefined || Idoc.E1EDP01.length < 1 || Idoc.E1EDP01[0].GEWEI == null || Idoc.E1EDP01[0].GEWEI === undefined || Idoc.E1EDP01[0].GEWEI.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDP01.GEWEI =  ", Idoc.E1EDP01[0].GEWEI)
					args.push(Idoc.E1EDP01[0].GEWEI)
				}
				if (Idoc.E1EDP01 == null || Idoc.E1EDP01 === undefined || Idoc.E1EDP01.length < 1 || Idoc.E1EDP01[0].BRGEW == null || Idoc.E1EDP01[0].BRGEW === undefined || Idoc.E1EDP01[0].BRGEW.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDP01.BRGEW =  ", Idoc.E1EDP01[0].BRGEW)
					args.push(Idoc.E1EDP01[0].BRGEW)
				}
				if (Idoc.E1EDP01 == null || Idoc.E1EDP01 === undefined || Idoc.E1EDP01.length < 1 || Idoc.E1EDP01[0].PSTYV == null || Idoc.E1EDP01[0].PSTYV === undefined || Idoc.E1EDP01[0].PSTYV.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDP01.PSTYV =  ", Idoc.E1EDP01[0].PSTYV)
					args.push(Idoc.E1EDP01[0].PSTYV)
				}
				if (Idoc.E1EDP01 == null || Idoc.E1EDP01 === undefined || Idoc.E1EDP01.length < 1 || Idoc.E1EDP01[0].WERKS == null || Idoc.E1EDP01[0].WERKS === undefined || Idoc.E1EDP01[0].WERKS.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDP01.WERKS =  ", Idoc.E1EDP01[0].WERKS)
					args.push(Idoc.E1EDP01[0].WERKS)
				}

				if (Idoc.E1EDP01 == null || Idoc.E1EDP01 === undefined || Idoc.E1EDP01.length < 1 || Idoc.E1EDP01[0].E1EDP02[0].QUALF == null || Idoc.E1EDP01[0].E1EDP02[0].QUALF === undefined || Idoc.E1EDP01[0].E1EDP02[0].QUALF.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDP01.E1EDP02.QUALF =  ", Idoc.E1EDP01[0].E1EDP02[0].QUALF)
					args.push(Idoc.E1EDP01[0].E1EDP02[0].QUALF)
				}

				/*	if (Idoc.E1EDP01.E1EDP02.QUALF == null || Idoc.E1EDP01.E1EDP02.QUALF === undefined || Idoc.E1EDP01.E1EDP02.QUALF.length < 1) {
						args.push("")
					} else {
						console.log("Idoc.E1EDP01.E1EDP02.QUALF =  ", Idoc.E1EDP01.E1EDP02.QUALF)
						args.push(Idoc.E1EDP01.E1EDP02.QUALF)
					}*/

				if (Idoc.E1EDP01 == null || Idoc.E1EDP01 === undefined || Idoc.E1EDP01.length < 1 || Idoc.E1EDP01[0].E1EDP02[0].BELNR == null || Idoc.E1EDP01[0].E1EDP02[0].BELNR === undefined || Idoc.E1EDP01[0].E1EDP02[0].BELNR.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDP01.E1EDP02.BELNR =  ", Idoc.E1EDP01[0].E1EDP02[0].BELNR)
					args.push(Idoc.E1EDP01[0].E1EDP02[0].BELNR)
				}
				if (Idoc.E1EDP01 == null || Idoc.E1EDP01 === undefined || Idoc.E1EDP01.length < 1 || Idoc.E1EDP01[0].E1EDP02[0].DATUM == null || Idoc.E1EDP01[0].E1EDP02[0].DATUM === undefined || Idoc.E1EDP01[0].E1EDP02[0].DATUM.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDP01.E1EDP02.DATUM =  ", Idoc.E1EDP01[0].E1EDP02[0].DATUM)
					args.push(Idoc.E1EDP01[0].E1EDP02[0].DATUM)
				}


				/*if (Idoc.E1EDP01 == null || Idoc.E1EDP01 === undefined || Idoc.E1EDP01.length < 1||Idoc.E1EDP01[0].E1EDP02[0].ZEILE == null || Idoc.E1EDP01[0].E1EDP02[0].ZEILE === undefined || Idoc.E1EDP01[0].E1EDP02[0].ZEILE.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDP01.E1EDP02.ZEILE =  ", Idoc.E1EDP01[0].E1EDP02[0].ZEILE)
					args.push(Idoc.E1EDP01[0].E1EDP02[0].ZEILE)
				} */

				if (Idoc.E1EDP01 == null || Idoc.E1EDP01 === undefined || Idoc.E1EDP01.length < 1 || Idoc.E1EDP01[0].E1EDP26[0].QUALF == null || Idoc.E1EDP01[0].E1EDP26[0].QUALF === undefined || Idoc.E1EDP01[0].E1EDP26[0].QUALF.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDP01.E1EDP26.QUALF =  ", Idoc.E1EDP01[0].E1EDP26[0].QUALF)
					args.push(Idoc.E1EDP01[0].E1EDP26[0].QUALF)
				}
				if (Idoc.E1EDP01 == null || Idoc.E1EDP01 === undefined || Idoc.E1EDP01.length < 1 || Idoc.E1EDP01[0].E1EDP26[0].BETRG == null || Idoc.E1EDP01[0].E1EDP26[0].BETRG === undefined || Idoc.E1EDP01[0].E1EDP26[0].BETRG.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDP01.E1EDP26.BETRG =  ", Idoc.E1EDP01[0].E1EDP26[0].BETRG)
					args.push(Idoc.E1EDP01[0].E1EDP26[0].BETRG)
				}

				//E1EDS01
				if (Idoc.E1EDS01 == null || Idoc.E1EDS01 === undefined || Idoc.E1EDS01.length < 1 || Idoc.E1EDS01[0].SUMID == null || Idoc.E1EDS01[0].SUMID === undefined || Idoc.E1EDS01[0].SUMID.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDS01.SUMID = ", Idoc.E1EDS01[0].SUMID)
					args.push(Idoc.E1EDS01[0].SUMID)
				}
				if (Idoc.E1EDS01 == null || Idoc.E1EDS01 === undefined || Idoc.E1EDS01.length < 1 || Idoc.E1EDS01[0].SUMME == null || Idoc.E1EDS01[0].SUMME === undefined || Idoc.E1EDS01[0].SUMME.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDS01.SUMME = ", Idoc.E1EDS01[0].SUMME)
					args.push(Idoc.E1EDS01[0].SUMME)
				}
				if (Idoc.E1EDS01 == null || Idoc.E1EDS01 === undefined || Idoc.E1EDS01.length < 1 || Idoc.E1EDS01[0].WAERQ == null || Idoc.E1EDS01[0].WAERQ === undefined || Idoc.E1EDS01[0].WAERQ.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.E1EDS01.WAERQ = ", Idoc.E1EDS01[0].WAERQ)
					args.push(Idoc.E1EDS01[0].WAERQ)
				}
				//Adding Date Field
				var today = new Date();
				var dd = String(today.getDate()).padStart(2, '0');
				var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0 !
				var yyyy = today.getFullYear();

				//today = dd + '-' + mm + '-' + yyyy;
				let todayString = yyyy + '-' + mm + '-' + dd;


				console.log("TODAY ===== ", todayString)
				var day2 = new Date(yyyy, mm, dd)
				//today = "12-05-2019"
				//var unix = Math.round((new Date(today)) / 1000); 
				var unix = Math.floor(day2 / 1000);
				console.log("TODAY's UNIX DATE === ", unix)
				args.push(unix.toString())
				
				//args.push("###aaa@@##")
				console.log(args);
				console.log("Length of args ", args.length)

				var message = await invoke.invokeChaincode(peers, channelName, chaincodeName, fcn, args, username, orgName);
				
				//req.body.ZINVOIC02.IDOC.E1EDK01.ZTERM = "P124"
				var temp = req.body.ZINVOIC02.IDOC;
				temp.E1EDK01.ZTERM = "P124"
				
				temp.E1EDK01.CURCY=fs.USDUSD.LCY
				temp.E1EDK01.HWAER=fs.USDUSD.CCY
				temp.E1EDK01.WKURS=fs.USDUSD.RTE

				//req.body.ZINVOIC02.IDOC.E1EDP01.E1EDP01['ZEILE'] = '10';
				
				var args11 = {ZINVOIC02_TEST: {IDOC: temp}};
				console.log("temp: ", temp)
				

				
				
				
				//args11.push({ZINVOIC02_TEST: {IDOC: temp}})
				
				console.log("India : ", args11) 
				
				let invoiceResponsePil = await invoiceCreation.invokeInvoiceCreationPil(args11);
				console.log("responsedata == ", invoiceResponsePil.responsedata)
				console.log("Invoice Message == ", invoiceResponsePil)
				let response = message.message + " and " + invoiceResponsePil
				res.send(response)	
			}

		}
	} catch (e) {
		console.log("Expection occured ", e)
		res.status(500);
		res.send("Expection occured in Invoice Response")
	}
})

//Pil invoice

app.post('/channels/PilInvoice', async function (req, res) {
	logger.debug('==================== INVOKE PilInvoiceResponse ON CHAINCODE ==================');
	try {

		console.log("Req == ", req.body)
		var args = [];
		var peers = "peer0.org1.example.com"
		var channelName = "mychannel"
		var chaincodeName = "mycc4"
		var username = "Jim"
		var orgName = "Org1"
		var fcn = "createInvoice"
		var Inv = req.body.ZGSVERFBC;
		if (Inv === undefined || Inv === null || Inv.length < 1) {
			res.status(500);
			res.json("Invalid Arguments");
		}
		else {

			var Idoc = req.body.ZGSVERFBC.IDOC;
			if (Idoc === undefined || Idoc === null || Idoc.length < 1) {
				res.status(500);
				res.json("Invalid Arguments ");
			}
			else {
				//Z1BCHEAD
				if (Idoc.Z1BCHEAD == null || Idoc.Z1BCHEAD === undefined || Idoc.Z1BCHEAD.length < 1||Idoc.Z1BCHEAD.BELNR == null || Idoc.Z1BCHEAD.BELNR === undefined || Idoc.Z1BCHEAD.BELNR.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.Z1BCHEAD.BELNR = ", Idoc.Z1BCHEAD.BELNR)
					args.push(Idoc.Z1BCHEAD.BELNR)
				}
				if (Idoc.Z1BCHEAD == null || Idoc.Z1BCHEAD === undefined || Idoc.Z1BCHEAD.length < 1||Idoc.Z1BCHEAD.GJAHR == null || Idoc.Z1BCHEAD.GJAHR === undefined || Idoc.Z1BCHEAD.GJAHR.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.Z1BCHEAD.GJAHR = ", Idoc.Z1BCHEAD.GJAHR)
					args.push(Idoc.Z1BCHEAD.GJAHR)
				}
				if (Idoc.Z1BCHEAD == null || Idoc.Z1BCHEAD === undefined || Idoc.Z1BCHEAD.length < 1||Idoc.Z1BCHEAD.BUKRS == null || Idoc.Z1BCHEAD.BUKRS === undefined || Idoc.Z1BCHEAD.BUKRS.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.Z1BCHEAD.BUKRS = ", Idoc.Z1BCHEAD.BUKRS)
					args.push(Idoc.Z1BCHEAD.BUKRS)
				}
				if (Idoc.Z1BCHEAD == null || Idoc.Z1BCHEAD === undefined || Idoc.Z1BCHEAD.length < 1||Idoc.Z1BCHEAD.LIFNR == null || Idoc.Z1BCHEAD.LIFNR === undefined || Idoc.Z1BCHEAD.LIFNR.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.Z1BCHEAD.LIFNR = ", Idoc.Z1BCHEAD.LIFNR)
					args.push(Idoc.Z1BCHEAD.LIFNR)
				}
				if (Idoc.Z1BCHEAD == null || Idoc.Z1BCHEAD === undefined || Idoc.Z1BCHEAD.length < 1||Idoc.Z1BCHEAD.BUDAT == null || Idoc.Z1BCHEAD.BUDAT === undefined || Idoc.Z1BCHEAD.BUDAT.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.Z1BCHEAD.BUDAT = ", Idoc.Z1BCHEAD.BUDAT)
					args.push(Idoc.Z1BCHEAD.BUDAT)
				}
				if (Idoc.Z1BCHEAD == null || Idoc.Z1BCHEAD === undefined || Idoc.Z1BCHEAD.length < 1||Idoc.Z1BCHEAD.MENGE == null || Idoc.Z1BCHEAD.MENGE === undefined || Idoc.Z1BCHEAD.MENGE.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.Z1BCHEAD.MENGE = ", Idoc.Z1BCHEAD.MENGE)
					args.push(Idoc.Z1BCHEAD.MENGE)
				}
				if (Idoc.Z1BCHEAD == null || Idoc.Z1BCHEAD === undefined || Idoc.Z1BCHEAD.length < 1||Idoc.Z1BCHEAD.RMWWR == null || Idoc.Z1BCHEAD.RMWWR === undefined || Idoc.Z1BCHEAD.RMWWR.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.Z1BCHEAD.RMWWR = ", Idoc.Z1BCHEAD.RMWWR)
					args.push(Idoc.Z1BCHEAD.RMWWR)
				}
				if (Idoc.Z1BCHEAD == null || Idoc.Z1BCHEAD === undefined || Idoc.Z1BCHEAD.length < 1||Idoc.Z1BCHEAD.WAERS == null || Idoc.Z1BCHEAD.WAERS === undefined || Idoc.Z1BCHEAD.WAERS.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.Z1BCHEAD.WAERS = ", Idoc.Z1BCHEAD.WAERS)
					args.push(Idoc.Z1BCHEAD.WAERS)
				}
				if (Idoc.Z1BCHEAD == null || Idoc.Z1BCHEAD === undefined || Idoc.Z1BCHEAD.length < 1||Idoc.Z1BCHEAD.KURSF == null || Idoc.Z1BCHEAD.KURSF === undefined || Idoc.Z1BCHEAD.KURSF.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.Z1BCHEAD.KURSF = ", Idoc.Z1BCHEAD.KURSF)
					args.push(Idoc.Z1BCHEAD.KURSF)
				}
				if (Idoc.Z1BCHEAD == null || Idoc.Z1BCHEAD === undefined || Idoc.Z1BCHEAD.length < 1||Idoc.Z1BCHEAD.EBELN == null || Idoc.Z1BCHEAD.EBELN === undefined || Idoc.Z1BCHEAD.EBELN.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.Z1BCHEAD.EBELN = ", Idoc.Z1BCHEAD.EBELN)
					args.push(Idoc.Z1BCHEAD.EBELN)
				}
				if (Idoc.Z1BCHEAD == null || Idoc.Z1BCHEAD === undefined || Idoc.Z1BCHEAD.length < 1||Idoc.Z1BCHEAD.EBELP == null || Idoc.Z1BCHEAD.EBELP === undefined || Idoc.Z1BCHEAD.EBELP.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.Z1BCHEAD.EBELP = ", Idoc.Z1BCHEAD.EBELP)
					args.push(Idoc.Z1BCHEAD.EBELP)
				}
				if (Idoc.Z1BCHEAD == null || Idoc.Z1BCHEAD === undefined || Idoc.Z1BCHEAD.length < 1||Idoc.Z1BCHEAD.MATNR == null || Idoc.Z1BCHEAD.MATNR === undefined || Idoc.Z1BCHEAD.MATNR.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.Z1BCHEAD.MATNR = ", Idoc.Z1BCHEAD.MATNR)
					args.push(Idoc.Z1BCHEAD.MATNR)
				}
				if (Idoc.Z1BCHEAD == null || Idoc.Z1BCHEAD === undefined || Idoc.Z1BCHEAD.length < 1||Idoc.Z1BCHEAD.WERKS == null || Idoc.Z1BCHEAD.WERKS === undefined || Idoc.Z1BCHEAD.WERKS.length < 1) {
					args.push("")
				} else {
					console.log("Idoc.Z1BCHEAD.WERKS = ", Idoc.Z1BCHEAD.WERKS)
					args.push(Idoc.Z1BCHEAD.WERKS)
				}
				
	            var today = new Date();
				var dd = String(today.getDate()).padStart(2, '0');
				var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0 !
				var yyyy = today.getFullYear();
				var day2 = new Date(yyyy,mm,dd) 
				var unix = Math.floor(day2 / 1000);
				console.log("TODAY's UNIX DATE === ",unix)
				args.push(unix.toString())
				
				//args.push("###aBC###")
				
				console.log(args);
				console.log("Length of args ", args.length)
				
								
				var message = await invoke.invokeChaincode(peers, channelName, chaincodeName, fcn, args, username, orgName);
				res.send(message.message)
			}

		}
	} catch (e) {
		console.log("Expection occured ", e)
		res.status(500);
		res.send("Expection occured in Invoice Response")
	}
	
})

// Invoke transaction on chaincode on target peers
app.post('/channels/:channelName/chaincodes/:chaincodeName', async function(req, res) {
	logger.debug('==================== INVOKE ON CHAINCODE ==================');
	var peers = req.body.peers;
	var chaincodeName = req.params.chaincodeName;
	var channelName = req.params.channelName;
	var fcn = req.body.fcn;
	var args = req.body.args;
	logger.debug('channelName  : ' + channelName);
	logger.debug('chaincodeName : ' + chaincodeName);
	logger.debug('fcn  : ' + fcn);
	logger.debug('args  : ' + args);
	if (!chaincodeName) {
		res.json(getErrorMessage('\'chaincodeName\''));
		return;
	}
	if (!channelName) {
		res.json(getErrorMessage('\'channelName\''));
		return;
	}
	if (!fcn) {
		res.json(getErrorMessage('\'fcn\''));
		return;
	}
	if (!args) {
		res.json(getErrorMessage('\'args\''));
		return;
	}

	logger.debug('peers  : ' + peers);
	logger.debug('channelName  : ' + channelName);
	logger.debug('chaincodeName  : ' + chaincodeName);
	logger.debug('fcn  : ' + fcn);
	logger.debug('args  : ' + args);
	logger.debug('req.username : ' + req.username);
	logger.debug('req.orgname  : ' + req.orgname);
	req.username = "Jim"
	req.orgname = "Org1"
	logger.debug('req.username : ' + req.username);
	logger.debug('req.orgname  : ' + req.orgname);
	let message = await invoke.invokeChaincode(peers, channelName, chaincodeName, fcn, args, req.username, req.orgname);
	res.send(message);
});
// Query on chaincode on target peers
app.get('/channels/:channelName/chaincodes/:chaincodeName', async function(req, res) {
	logger.debug('==================== QUERY BY CHAINCODE ==================');
	var channelName = req.params.channelName;
	var chaincodeName = req.params.chaincodeName;
	let args = req.query.args;
	let fcn = req.query.fcn;
	let peer = req.query.peer;

	logger.debug('channelName : ' + channelName);
	logger.debug('chaincodeName : ' + chaincodeName);
	logger.debug('fcn : ' + fcn);
	logger.debug('args : ' + args);

	if (!chaincodeName) {
		res.json(getErrorMessage('\'chaincodeName\''));
		return;
	}
	if (!channelName) {
		res.json(getErrorMessage('\'channelName\''));
		return;
	}
	if (!fcn) {
		res.json(getErrorMessage('\'fcn\''));
		return;
	}
	if (!args) {
		res.json(getErrorMessage('\'args\''));
		return;
	}
	args = args.replace(/'/g, '"');
	args = JSON.parse(args);
	logger.debug(args);

	let message = await query.queryChaincode(peer, channelName, chaincodeName, args, fcn, req.username, req.orgname);
	res.send(message);
});
//  Query Get Block by BlockNumber
app.get('/channels/:channelName/blocks/:blockId', async function(req, res) {
	logger.debug('==================== GET BLOCK BY NUMBER ==================');
	let blockId = req.params.blockId;
	let peer = req.query.peer;
	logger.debug('channelName : ' + req.params.channelName);
	logger.debug('BlockID : ' + blockId);
	logger.debug('Peer : ' + peer);
	if (!blockId) {
		res.json(getErrorMessage('\'blockId\''));
		return;
	}

	let message = await query.getBlockByNumber(peer, req.params.channelName, blockId, req.username, req.orgname);
	res.send(message);
});
// Query Get Transaction by Transaction ID
app.get('/channels/:channelName/transactions/:trxnId', async function(req, res) {
	logger.debug('================ GET TRANSACTION BY TRANSACTION_ID ======================');
	logger.debug('channelName : ' + req.params.channelName);
	let trxnId = req.params.trxnId;
	let peer = req.query.peer;
	if (!trxnId) {
		res.json(getErrorMessage('\'trxnId\''));
		return;
	}

	let message = await query.getTransactionByID(peer, req.params.channelName, trxnId, req.username, req.orgname);
	res.send(message);
});
// Query Get Block by Hash
app.get('/channels/:channelName/blocks', async function(req, res) {
	logger.debug('================ GET BLOCK BY HASH ======================');
	logger.debug('channelName : ' + req.params.channelName);
	let hash = req.query.hash;
	let peer = req.query.peer;
	if (!hash) {
		res.json(getErrorMessage('\'hash\''));
		return;
	}

	let message = await query.getBlockByHash(peer, req.params.channelName, hash, req.username, req.orgname);
	res.send(message);
});
//Query for Channel Information
app.get('/channels/:channelName', async function(req, res) {
	logger.debug('================ GET CHANNEL INFORMATION ======================');
	logger.debug('channelName : ' + req.params.channelName);
	let peer = req.query.peer;

	let message = await query.getChainInfo(peer, req.params.channelName, req.username, req.orgname);
	res.send(message);
});
//Query for Channel instantiated chaincodes
app.get('/channels/:channelName/chaincodes', async function(req, res) {
	logger.debug('================ GET INSTANTIATED CHAINCODES ======================');
	logger.debug('channelName : ' + req.params.channelName);
	let peer = req.query.peer;

	let message = await query.getInstalledChaincodes(peer, req.params.channelName, 'instantiated', req.username, req.orgname);
	res.send(message);
});
// Query to fetch all Installed/instantiated chaincodes
app.get('/chaincodes', async function(req, res) {
	var peer = req.query.peer;
	var installType = req.query.type;
	logger.debug('================ GET INSTALLED CHAINCODES ======================');

	let message = await query.getInstalledChaincodes(peer, null, 'installed', req.username, req.orgname)
	res.send(message);
});
// Query to fetch channels
app.get('/channels', async function(req, res) {
	logger.debug('================ GET CHANNELS ======================');
	logger.debug('peer: ' + req.query.peer);
	var peer = req.query.peer;
	if (!peer) {
		res.json(getErrorMessage('\'peer\''));
		return;
	}

	let message = await query.getChannels(peer, req.username, req.orgname);
	res.send(message);
});
