
const invokeInvoiceCreation = async function (data) {
    var request = require("request");
    let responsedata = null;
    
  return new Promise(function (resolve, reject) {
    var options = {
        method: 'POST',
        url: 'https://dev.apipil.philips.com/ws/rest/BlockChain/CreateInvoice/',
        headers:
        {
			system: 'DAP',
            authorization: 'Basic dGVzdFVzZXI6dGVzdFBhc3M=',
            'content-type': 'application/json'
        },
        body: data,
        json: true
    };

    request(options, function (error, response, body) {
        if (error) {

            // build a response to send back to the REST caller
            console.log("response == ", response.statusCode)
            responsedata = {
                success: false,
                message: "Invoice Creation Failed "
            };
            resolve(responsedata);

        } else {

            // build a response to send back to the REST caller

            console.log(body);
            console.log("response == ", response.statusCode)
            if (response.statusCode == 200) {
                // responsedata = {
                //     success: true,
                //     message: "Invoice Created Successfully in Dell Bhoomi"
                // };
                responsedata = "Invoice Created Successfully ";
                resolve(responsedata);
            } else {
                responsedata = {
                    success: false,
                    message: "Invoice Creation Failed "
                };

                resolve(responsedata);
            }


        }

    });
})
}
const invokeInvoiceCreationFil = async function (idoc2) {
    var request = require("request");
    let responsedata = null;
    
  return new Promise(function (resolve, reject) {
    var options = {
        method: 'POST',
        url: 'https://dev.apipil.philips.com/ws/rest/BlockChain/v1/Invoice/',
        headers:
        {
			system: 'FIL',
            authorization: 'Basic dGVzdFVzZXI6dGVzdFBhc3M=',
            'content-type': 'application/json'
        },
        body: idoc2,
        json: true
    };

    request(options, function (error, response, body) {
        if (error) {

            // build a response to send back to the REST caller
            console.log("response == ", response.statusCode)
            responsedata = {
                success: false,
                message: "Invoice Creation Failed "
            };
            resolve(responsedata);

        } else {

            // build a response to send back to the REST caller

            console.log(body);
            console.log("response == ", response.statusCode)
            if (response.statusCode == 200) {
                // responsedata = {
                //     success: true,
                //     message: "Invoice Created Successfully in Dell Bhoomi"
                // };
                responsedata = "Invoice Sent Successfully to FIL";
                resolve(responsedata);
            } else {
                responsedata = {
                    success: false,
                    message: "Invoice Creation Failed "
                };

                resolve(responsedata);
            }


        }

    });
})
}
const invokeInvoiceCreationPil = async function (temp) {
    var request = require("request");
    let responsedata = null;
    
  return new Promise(function (resolve, reject) {
    var options = {
        method: 'POST',
        url: 'https://dev.apipil.philips.com/ws/rest/BlockChain/v1/Invoice/',
        headers:
        {
			system: 'PIL',
            authorization: 'Basic dGVzdFVzZXI6dGVzdFBhc3M=',
            'content-type': 'application/json'
        },
        body: temp,
        json: true
    };

    request(options, function (error, response, body) {
        if (error) {

            // build a response to send back to the REST caller
            console.log("response == ", response.statusCode)
            responsedata = {
                success: false,
                message: "Invoice Creation Failed "
            };
            resolve(responsedata);

        } else {

            // build a response to send back to the REST caller

            console.log(body);
            console.log("response == ", response.statusCode)
            if (response.statusCode == 200) {
                responsedata = "Invoice Sent Successfully to FIL";
                resolve(responsedata);
            } else {
                responsedata = {
                    success: false,
                    message: "Invoice Creation Failed "
                };
                resolve(responsedata);
            }


        }

    });
})
}
exports.invokeInvoiceCreation = invokeInvoiceCreation;
exports.invokeInvoiceCreationFil = invokeInvoiceCreationFil;
exports.invokeInvoiceCreationPil = invokeInvoiceCreationPil;