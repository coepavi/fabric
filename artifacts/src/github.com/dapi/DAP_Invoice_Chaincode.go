package main

import (
    "fmt"
    "strconv"
    "encoding/json"
    "github.com/hyperledger/fabric/core/chaincode/shim"
    pb "github.com/hyperledger/fabric/protos/peer"
)

// Invoice implements a simple chaincode to manage Invoice
type Invoices struct {
}


var InvIndexStr = "_invid"

// Attributes of Invoice

type Invoice struct{

    Idoc_e1edk01_currcy string `json:"idoc_e1edk01_currcy"`
    Idoc_e1edk01_hwaer string `json:"idoc_e1edk01_hwaer"`
    Idoc_e1edk01_wkurs string `json:"idoc_e1edk01_wkurs"`
    Idoc_e1edk01_zterm string `json:"idoc_e1edk01_zterm"`
    Idoc_e1edk01_belnr string `json:"idoc_e1edk01_belnr"`
    Idoc_e1edk01_ntgew string `json:"idoc_e1edk01_ntgew"`
    Idoc_e1edk01_brgew string `json:"idoc_e1edk01_brgew"`
    Idoc_e1edk01_gewei string `json:"idoc_e1edk01_gewei"`
    Idoc_e1edk01_recipnt_no string `json:"idoc_e1edk01_recipnt_no"`
    Idoc_e1edk01_z1edk01_IV01_vbund string `json:"idoc_e1edk01_z1edk01_IV01_vbund"`
    Idoc_e1edka1_parvw0 string `json:"idoc_e1edka1_parvw0"`
    Idoc_e1edka1_partn0 string `json:"idoc_e1edka1_partn0"`
    Idoc_e1edka1_lifnr string `json:"idoc_e1edka1_lifnr"`
    Idoc_e1edka1_parvw1 string `json:"idoc_e1edka1_parvw1"`
    Idoc_e1edka1_partn1 string `json:"idoc_e1edka1_partn1"`
    Idoc_e1edka1_parvw2 string `json:"idoc_e1edka1_parvw2"`
    Idoc_e1edka1_partn2 string `json:"idoc_e1edka1_partn2"`
    Idoc_e1edka1_parvw3 string `json:"idoc_e1edka1_parvw3"`
    Idoc_e1edka1_partn3 string `json:"idoc_e1edka1_partn3"`
    Idoc_e1edko2_qualf0 string `json:"idoc_e1edko2_qualf0"`
    Idoc_e1edko2_belnr0 string `json:"idoc_e1edko2_belnr0"`
    Idoc_e1edko2_datum0 string `json:"idoc_e1edko2_datum0"`
    Idoc_e1edko2_qualf1 string `json:"idoc_e1edko2_qualf1"`
    Idoc_e1edko2_belnr1 string `json:"idoc_e1edko2_belnr1"`
    Idoc_e1edko2_datum1 string `json:"idoc_e1edko2_datum1"`
    Idoc_e1edko2_qualf2 string `json:"idoc_e1edko2_qualf2"`
    Idoc_e1edko2_belnr2 string `json:"idoc_e1edko2_belnr2"`
    Idoc_e1edko2_datum2 string `json:"idoc_e1edko2_datum2"`
    Idoc_e1edko5_alckz string `json:"idoc_e1edko5_alckz"`
    Idoc_e1edko5_kschl string `json:"idoc_e1edko5_kschl"`
    Idoc_e1edko5_betrg string `json:"idoc_e1edko5_betrg"`
    Idoc_e1edko5_koein string `json:"idoc_e1edko5_koein"`
    Idoc_e1edk04_mwskz string `json:"idoc_e1edk04_mwskz"`
    Idoc_e1edk17_qualf string `json:"idoc_e1edk17_qualf"`
    Idoc_e1edk17_lkond string `json:"idoc_e1edk17_lkond"`
    Idoc_e1edk17_lktext string `json:"idoc_e1edk17_lktext"`
    Idoc_e1edp01_posex string `json:"idoc_e1edp01_posex"`
    Idoc_e1edp01_menge string `json:"idoc_e1edp01_menge"`
    Idoc_e1edp01_menee string `json:"idoc_e1edp01_menee"`
    Idoc_e1edp01_ntgew string `json:"idoc_e1edp01_ntgew"`
    Idoc_e1edp01_gewei string `json:"idoc_e1edp01_gewei"`
    Idoc_e1edp01_brgew string `json:"idoc_e1edp01_brgew"`
    Idoc_e1edp01_werks string `json:"idoc_e1edp01_werks"`
    Idoc_e1edp01_z1edp01_voleh string `json:"idoc_e1edp01_z1edp01_voleh"`
    Idoc_e1edp01_z1edp01_btvol string `json:"idoc_e1edp01_z1edp01_btvol"`
    Idoc_e1edpo1_e1edp02_qualf string `json:"idoc_e1edpo1_e1edp02_qualf"`
    Idoc_e1edpo1_e1edp02_belnr string `json:"idoc_e1edpo1_e1edp02_belnr"`
    Idoc_e1edpo1_e1edp02_zeile string `json:"idoc_e1edpo1_e1edp02_zeile"`
    Idoc_e1edpo1_e1edp26_qualf string `json:"idoc_e1edpo1_e1edp26_qualf"`
    Idoc_e1edpo1_e1edp26_betrg string `json:"idoc_e1edpo1_e1edp26_betrg"`
    Idoc_e1edpo1_e1edp05_alckz string `json:"idoc_e1edpo1_e1edp05_alckz"`
    Idoc_e1edpo1_e1edp05_kschl string `json:"idoc_e1edpo1_e1edp05_kschl"`
    Idoc_e1edpo1_e1edp05_betrg string `json:"idoc_e1edpo1_e1edp05_betrg"`
    Idoc_e1edpo1_e1edpo4_mwskz string `json:"idoc_e1edpo1_e1edpo4_mwskz"`
    Idoc_e1edpo1_e1edp19_qualf string `json:"idoc_e1edpo1_e1edp19_qualf"`
    Idoc_e1edpo1_e1edp19_idtnr string `json:"idoc_e1edpo1_e1edp19_idtnr"`
    Transaction_date int `json:"date"`
    Hash string `json:"hash"`

}

// ===================================================================================
// Main
// ===================================================================================
func main() {
    err := shim.Start(new(Invoices))
    if err != nil {
        fmt.Printf("Error starting Invoice chaincode: %s", err)
    }
}



// ===========================
// Init initializes chaincode
// ===========================
func (t *Invoices) Init(stub shim.ChaincodeStubInterface) pb.Response {
    var empty []string
    var err error
    jsonAsBytes, _ := json.Marshal(empty)                               //marshal an emtpy array of strings to clear the index
    err = stub.PutState(InvIndexStr, jsonAsBytes)
    if err != nil {
        return shim.Error(err.Error())
    }
    eventMessage := "{ \"message\" : \"Invoice chaincode is deployed successfully.\", \"code\" : \"200\"}"
    err = stub.SetEvent("evtsender", []byte(eventMessage))
    if err != nil {
        return shim.Error(err.Error())
    }
    return shim.Success(nil)
}


// ========================================
// Invoke - Our entry point for Invocations
// ========================================
func (t *Invoices) Invoke(stub shim.ChaincodeStubInterface) pb.Response {
    function, args := stub.GetFunctionAndParameters()
    fmt.Println("invoke is running " + function)

     if function == "createInvoice" { //create Invoice in DAP
        return t.createInvoice(stub, args)
    }else if function == "getInvoiceByPurchaseID" { //find invoice for a particular purchase id using rich query
        return t.getInvoiceByPurchaseID(stub, args)
    } else if function == "getAllDAPInvoice" { //Get All  Invoice from DAP
        return t.getAllDAPInvoice(stub, args)
    }  else if function == "getAllDAPInvoiceDate" { //Get All  Invoice from DAP By Date
        return t.getAllDAPInvoiceDate(stub, args)
    } 
	 
    eventMessage := "{ \"message\" : \"Received unknown function invocation\", \"code\" : \"503\"}"
    err := stub.SetEvent("errEvent", []byte(eventMessage))
    if err != nil {
        return shim.Error(err.Error())
    }
    fmt.Println("invoke did not find func: " + function) //error
    return shim.Error("Received unknown function invocation")
}




// ==================================================================
// createInvoice - create a new Invoice, store into chaincode state
// ==================================================================

func (t *Invoices) createInvoice(stub shim.ChaincodeStubInterface, args []string) pb.Response {
    var err error

    if len(args) != 58 {
        return shim.Error("Incorrect number of arguments. Expecting 58")
	}
    

    idoc_e1edk01_currcy := args[0]
    idoc_e1edk01_hwaer := args[1]
    idoc_e1edk01_wkurs := args[2]
    idoc_e1edk01_zterm := args[3]
    idoc_e1edk01_belnr := args[4]
    idoc_e1edk01_ntgew := args[5]
    idoc_e1edk01_brgew := args[6]
    idoc_e1edk01_gewei := args[7]
    idoc_e1edk01_recipnt_no := args[8]
    idoc_e1edk01_z1edk01_IV01_vbund := args[9]
    idoc_e1edka1_parvw0 := args[10]
    idoc_e1edka1_partn0 := args[11]
    idoc_e1edka1_lifnr := args[12]
    idoc_e1edka1_parvw1 := args[13]
    idoc_e1edka1_partn1 := args[14]
    idoc_e1edka1_parvw2 := args[15]
    idoc_e1edka1_partn2 := args[16]
    idoc_e1edka1_parvw3 := args[17]
    idoc_e1edka1_partn3 := args[18]
    idoc_e1edko2_qualf0 := args[19]
    idoc_e1edko2_belnr0 := args[20]
    idoc_e1edko2_datum0 := args[21]
    idoc_e1edko2_qualf1 := args[22]
    idoc_e1edko2_belnr1 := args[23]
    idoc_e1edko2_datum1 := args[24]
    idoc_e1edko2_qualf2 := args[25]
    idoc_e1edko2_belnr2 := args[26]
    idoc_e1edko2_datum2 := args[27]
    idoc_e1edko5_alckz := args[28]
    idoc_e1edko5_kschl := args[29]
    idoc_e1edko5_betrg := args[30]
    idoc_e1edko5_koein := args[31]
    idoc_e1edk04_mwskz := args[32]
    idoc_e1edk17_qualf := args[33]
    idoc_e1edk17_lkond := args[34]
    idoc_e1edk17_lktext := args[35]
    idoc_e1edp01_posex := args[36]
    idoc_e1edp01_menge := args[37]
    idoc_e1edp01_menee := args[38]
    idoc_e1edp01_ntgew := args[39]
    idoc_e1edp01_gewei := args[40]
    idoc_e1edp01_brgew := args[41]
    idoc_e1edp01_werks := args[42]
    idoc_e1edp01_z1edp01_voleh := args[43]
    idoc_e1edp01_z1edp01_btvol := args[44]
    idoc_e1edpo1_e1edp02_qualf := args[45]
    idoc_e1edpo1_e1edp02_belnr := args[46]
    idoc_e1edpo1_e1edp02_zeile := args[47]
    idoc_e1edpo1_e1edp26_qualf := args[48]
    idoc_e1edpo1_e1edp26_betrg := args[49]
    idoc_e1edpo1_e1edp05_alckz := args[50]
    idoc_e1edpo1_e1edp05_kschl := args[51]
    idoc_e1edpo1_e1edp05_betrg := args[52]
    idoc_e1edpo1_e1edpo4_mwskz := args[53]
    idoc_e1edpo1_e1edp19_qualf := args[54]
    idoc_e1edpo1_e1edp19_idtnr := args[55]
    datestring := args[56]
    hash := args[57]

    	  // ==== Check if Invoice already exists ====
	  invoiceAsBytes, err := stub.GetState(idoc_e1edpo1_e1edp02_belnr)
	  if err != nil {
		  return shim.Error("Failed to get invoice : " + err.Error())
	  } else if invoiceAsBytes != nil {
		  fmt.Println("This invoice order already exists: " + idoc_e1edpo1_e1edp02_belnr)
		  return shim.Error("This invoice order  already exists: " + idoc_e1edpo1_e1edp02_belnr)
	  }
  
      transaction_date, _err := strconv.Atoi(datestring)   //Date 1
      if _err != nil {
          return shim.Error(_err.Error())
      }
	  
    // ====marshal to JSON ====
	invoice := &Invoice{idoc_e1edk01_currcy,idoc_e1edk01_hwaer,idoc_e1edk01_wkurs,idoc_e1edk01_zterm,idoc_e1edk01_belnr,idoc_e1edk01_ntgew,idoc_e1edk01_brgew,idoc_e1edk01_gewei,idoc_e1edk01_recipnt_no,idoc_e1edk01_z1edk01_IV01_vbund,idoc_e1edka1_parvw0,idoc_e1edka1_partn0,idoc_e1edka1_lifnr,idoc_e1edka1_parvw1,idoc_e1edka1_partn1,idoc_e1edka1_parvw2,idoc_e1edka1_partn2,idoc_e1edka1_parvw3,idoc_e1edka1_partn3,idoc_e1edko2_qualf0,idoc_e1edko2_belnr0,idoc_e1edko2_datum0,idoc_e1edko2_qualf1,idoc_e1edko2_belnr1,idoc_e1edko2_datum1,idoc_e1edko2_qualf2,idoc_e1edko2_belnr2,idoc_e1edko2_datum2,idoc_e1edko5_alckz,idoc_e1edko5_kschl,idoc_e1edko5_betrg,idoc_e1edko5_koein,idoc_e1edk04_mwskz,idoc_e1edk17_qualf,idoc_e1edk17_lkond,idoc_e1edk17_lktext,idoc_e1edp01_posex,idoc_e1edp01_menge,idoc_e1edp01_menee,idoc_e1edp01_ntgew,idoc_e1edp01_gewei,idoc_e1edp01_brgew,idoc_e1edp01_werks,idoc_e1edp01_z1edp01_voleh,idoc_e1edp01_z1edp01_btvol,idoc_e1edpo1_e1edp02_qualf,idoc_e1edpo1_e1edp02_belnr,idoc_e1edpo1_e1edp02_zeile,idoc_e1edpo1_e1edp26_qualf,idoc_e1edpo1_e1edp26_betrg,idoc_e1edpo1_e1edp05_alckz,idoc_e1edpo1_e1edp05_kschl,idoc_e1edpo1_e1edp05_betrg,idoc_e1edpo1_e1edpo4_mwskz,idoc_e1edpo1_e1edp19_qualf,idoc_e1edpo1_e1edp19_idtnr,transaction_date,hash}
	

	invoiceJSONasBytes, err := json.Marshal(invoice)
    if err != nil {
        return shim.Error(err.Error())
    }
   
    // === Save product to state ===
    err = stub.PutState(idoc_e1edpo1_e1edp02_belnr, invoiceJSONasBytes)
    if err != nil {
        return shim.Error(err.Error())
    }

    //get the invoice index
    invoiceIndexAsBytes, err := stub.GetState(InvIndexStr)
    if err != nil {
        return shim.Error(err.Error())
    }
    var invoiceIndex []string

    json.Unmarshal(invoiceIndexAsBytes, &invoiceIndex)                          //un stringify it aka JSON.parse()
    fmt.Print("invoiceIndex: ")
    fmt.Println(invoiceIndex)
    //append
    invoiceIndex = append(invoiceIndex, idoc_e1edpo1_e1edp02_belnr)
    //add "idoc_e1edpo1_e1edp02_belnr" to index list
    jsonAsBytes, _ := json.Marshal(invoiceIndex)
    //store "idoc_e1edpo1_e1edp02_belnr" of invoice
    err = stub.PutState(InvIndexStr, jsonAsBytes)
    if err != nil {
        return shim.Error(err.Error())
    }

    eventMessage := "{ \"idoc_e1edpo1_e1edp02_belnr\" : \""+idoc_e1edpo1_e1edp02_belnr+"\", \"message\" : \"Invoice created succcessfully\", \"code\" : \"200\"}"
    err = stub.SetEvent("evtsender", []byte(eventMessage))
    if err != nil {
        return shim.Error(err.Error())
    }
	    // ==== Invoice is saved and indexed. Return success ====
		fmt.Println("- end createInvoice")
		return shim.Success(invoiceJSONasBytes)

}


// ============================================================
// getInvoiceByPurchaseID -  query a invoice by purchase order
// ============================================================
func (t *Invoices) getInvoiceByPurchaseID(stub shim.ChaincodeStubInterface, args []string) pb.Response {
    var  jsonResp string

    if len(args) != 1 {
        return shim.Error("Incorrect number of arguments. Expecting purchase order number of the invoice to query")
    }

    bstnr := args[0]
    valAsbytes, err := stub.GetState(bstnr) 
    if err != nil {
        jsonResp = "{\"Error\":\"Failed to get state for " + bstnr + "\"}"
        return shim.Error(jsonResp)
    } else if valAsbytes == nil {
        jsonResp = "{\"Purchase Order Number\": \""+ bstnr + "\", \"Error\":\"invoice  does not exist.\"}"
        return shim.Error(jsonResp)
    }

    return shim.Success(valAsbytes)
}



// ===================================================================================
// getAllDAPInvoice - Get all invoice  of DAP
// ===================================================================================
func (t *Invoices) getAllDAPInvoice(stub shim.ChaincodeStubInterface, args []string) pb.Response {

	if len(args) != 0 {
		return shim.Error("No arguements required")
    }
    
	var jsonResp, errResp string
	var err error
	var InvoiceIndex []string

	fmt.Println("- start getAllDAPInvoice")
	Invoice_Bytes, err := stub.GetState(InvIndexStr)
	if err != nil {
		return shim.Error("Failed to get DAP Invoice Request index")
	}
	fmt.Print("Invoice_Bytes : ")
	fmt.Println(Invoice_Bytes)
	json.Unmarshal(Invoice_Bytes, &InvoiceIndex)		//un stringify it aka JSON.parse()
	fmt.Print("InvoiceIndex : ")
	fmt.Println(InvoiceIndex)
	fmt.Println("len(InvoiceIndex) : ")
	fmt.Println(len(InvoiceIndex))
	jsonResp = "["
	for i,val := range InvoiceIndex{
		//fmt.Println(strconv.Itoa(i) + " - looking at " + val + " for all Reg request")
		valueAsBytes, err := stub.GetState(val)
		if err != nil {
			errResp = "{\"Error\":\"Failed to get state for " + val + "\"}"
			return shim.Error(errResp)
		}
		fmt.Print("valueAsBytes : ")
		fmt.Println(valueAsBytes)
		jsonResp = jsonResp  + string(valueAsBytes[:])
		if i < len(InvoiceIndex)-1 {
			jsonResp = jsonResp + ","
		}
	}
	// sz := len(jsonResp)
	// if sz > 0 && s[sz-1] == ',' {
	// 	jsonResp = jsonResp[:sz-1]
	// }
	jsonResp = jsonResp + "]"
	fmt.Println("jsonResp : " + jsonResp)
	fmt.Println("end getAllDAPInvoice")
	tosend := "Event send"
                        err = stub.SetEvent("evtsender", []byte(tosend))
                        if err != nil {
                            return shim.Error(err.Error())
                        }
	return shim.Success([]byte(jsonResp))
}



// ===================================================================================
// getAllDAPInvoiceDate - Get all invoice  of DAP
// ===================================================================================
func (t *Invoices) getAllDAPInvoiceDate(stub shim.ChaincodeStubInterface, args []string) pb.Response {
    
    if len(args) != 2 {
		return shim.Error("2 arguements required")
    }
    D1 := args[0]
    D2 := args[1]

    Date1, _err := strconv.Atoi(D1)   //Date 1
    if _err != nil {
		return shim.Error(_err.Error())
	}
	Date2, _err1 := strconv.Atoi(D2)   //Date 2
    if _err1 != nil {
		return shim.Error(_err1.Error())
	}
    
	var jsonResp, errResp string
	var err error
	var InvoiceIndex []string

	fmt.Println("- start getAllDAPInvoice")
	Invoice_Bytes, err := stub.GetState(InvIndexStr)
	if err != nil {
		return shim.Error("Failed to get DAP Invoice Request index")
	}
	fmt.Print("Invoice_Bytes : ")
	fmt.Println(Invoice_Bytes)
	json.Unmarshal(Invoice_Bytes, &InvoiceIndex)		//un stringify it aka JSON.parse()
	fmt.Print("InvoiceIndex : ")
	fmt.Println(InvoiceIndex)
	fmt.Println("len(InvoiceIndex) : ")
	fmt.Println(len(InvoiceIndex))
	jsonResp = "["
	for i,val := range InvoiceIndex{
		//fmt.Println(strconv.Itoa(i) + " - looking at " + val + " for all Reg request")
		valueAsBytes, err := stub.GetState(val)
		if err != nil {
			errResp = "{\"Error\":\"Failed to get state for " + val + "\"}"
			return shim.Error(errResp)
		}
		fmt.Print("valueAsBytes : ")
        fmt.Println(valueAsBytes)
        invoice := Invoice{}
        json.Unmarshal(valueAsBytes, &invoice)
        
        if (invoice.Transaction_date >= Date1 &&  invoice.Transaction_date <= Date2) {
		jsonResp = jsonResp  + string(valueAsBytes[:])
		if i < len(InvoiceIndex)-1 {
			jsonResp = jsonResp + ","
        }
     }
	}
	// sz := len(jsonResp)
	// if sz > 0 && s[sz-1] == ',' { 
	// 	jsonResp = jsonResp[:sz-1]
	// }
	jsonResp = jsonResp + "]"
	fmt.Println("jsonResp : " + jsonResp)
	fmt.Println("end getAllDAPInvoice")
	tosend := "Event send"
                        err = stub.SetEvent("evtsender", []byte(tosend))
                        if err != nil {
                            return shim.Error(err.Error())
                        }
	return shim.Success([]byte(jsonResp))
}