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

type Invoice struct {
    E1edk01_curcy string `json:"e1edk01_curcy"`
    E1edk01_hwaer string `json:"e1edk01_hwaer"`
    E1edk01_wkurs string `json:"e1edk01_wkurs"`
    E1edk01_zterm string `json:"e1edk01_zterm"`
    E1edk01_eigenuinr string `json:"e1edk01_eigenuinr"`
    E1edk01_bsart string `json:"e1edk01_bsart"`
    E1edk01_belnr string `json:"e1edk01_belnr"`
    E1edk01_ntgew string `json:"e1edk01_ntgew"`
    E1edk01_brgew string `json:"e1edk01_brgew"`
    E1edk01_gewei string `json:"e1edk01_gewei"`
    E1edk01_fkart_rl string `json:"e1edk01_fkart_rl"`
    E1edk01_receipient_no string `json:"e1edk01_receipient_no"`
    E1edk01_fktyp string `json:"e1edk01_fktyp"`
    E1edka1_parvw0 string `json:"e1edka1_parvw0"`
    E1edka1_partn0 string `json:"e1edka1_partn0"`
    E1edka1_lifnr0 string `json:"e1edka1_lifnr0"`
    E1edka1_name1_0 string `json:"e1edka1_name1_0"`
    E1edka1_name2_0 string `json:"e1edka1_name2_0"`
    E1edka1_stras0 string `json:"e1edka1_stras0"`
    E1edka1_pfach0 string `json:"e1edka1_pfach0"`
    E1edka1_ort01_0 string `json:"e1edka1_ort01_0"`
    E1edka1_pstlz0 string `json:"e1edka1_pstlz0"`
    E1edka1_pstl2_0 string `json:"e1edka1_pstl2_0"`
    E1edka1_land1_0 string `json:"e1edka1_land1_0"`
    E1edka1_spras0 string `json:"e1edka1_spras0"`
    E1edka1_bname0 string `json:"e1edka1_bname0"`
    E1edka1_paorg0 string `json:"e1edka1_paorg0"`
    E1edka1_parvw1 string `json:"e1edka1_parvw1"`
    E1edka1_partn1 string `json:"e1edka1_partn1"`
    E1edka1_lifnr1 string `json:"e1edka1_lifnr1"`
    E1edka1_name1_1 string `json:"e1edka1_name1_1"`
    E1edka1_name2_1 string `json:"e1edka1_name2_1"`
    E1edka1_stras1 string `json:"e1edka1_stras1"`
    E1edka1_pfach1 string `json:"e1edka1_pfach1"`
    E1edka1_ort01_1 string `json:"e1edka1_ort01_1"`
    E1edka1_pstlz1 string `json:"e1edka1_pstlz1"`
    E1edka1_pstl2_1 string `json:"e1edka1_pstl2_1"`
    E1edka1_land1_1 string `json:"e1edka1_land1_1"`
    E1edka1_spras1 string `json:"e1edka1_spras1"`
    E1edka1_ort02_1 string `json:"e1edka1_ort02_1"`
    E1edka1_regio_1 string `json:"e1edka1_regio_1"`
    E1edka1_ihrez_1 string `json:"e1edka1_ihrez_1"`
    E1edka1_ilnnr_1 string `json:"e1edka1_ilnnr_1"`
    E1edka1_spras_iso_1 string `json:"e1edka1_spras_iso_1"`
    E1edk02_qualf string `json:"e1edk02_qualf"`
    E1edk02_belnr string `json:"e1edk02_belnr"`    
    E1edk02_datum string `json:"e1edk02_datum"`
    E1edk17_qualf string `json:"e1edk17_qualf"`
    E1edk17_lkond string `json:"e1edk17_lkond"`
    E1edk17_lktext string `json:"e1edk17_lktext"`    
    E1edk18_qualf0 string `json:"e1edk18_qualf0"`
    E1edk18_tage0 string `json:"e1edk18_tage0"`
    E1edk18_prznt0 string `json:"e1edk18_prznt0"`  
    E1edk18_zterm_txt0 string `json:"e1edk18_zterm_txt0"`
    E1edk18_qualf1 string `json:"e1edk18_qualf1"`
    E1edk18_zterm_txt1 string `json:"e1edk18_zterm_txt1"`
    E1edp01_posex string `json:"e1edp01_posex"`    
    E1edp01_menge string `json:"e1edp01_menge"`
    E1edp01_menee string `json:"e1edp01_menee"`
    E1edp01_ntgew string `json:"e1edp01_ntgew"`
    E1edp01_gewei string `json:"e1edp01_gewei"`    
    E1edp01_brgew string `json:"e1edp01_brgew"`
    E1edp01_pstyv string `json:"e1edp01_pstyv"`
    E1edp01_werks string `json:"e1edp01_werks"`  
    E1edp01_e1edp02_qualf string `json:"e1edp01_e1edp02_qualf"`  
    E1edp01_e1edp02_belnr string `json:"e1edp01_e1edp02_belnr"`    
    E1edp01_e1edp02_datum string `json:"e1edp01_e1edp02_datum"`
    E1edp01_e1edp26_qualf string `json:"e1edp01_e1edp26_qualf"`
    E1edp01_e1edp26_betrg string `json:"e1edp01_e1edp26_betrg"`
    E1eds01_sumid string `json:"e1eds01_sumid"`    
    E1eds01_summe string `json:"e1eds01_summe"`
    E1eds01_waerq string `json:"e1eds01_waerq"`
    Transaction_date int `json:"date"`
    Transaction_hash string `json:"hash"`


}


//Fil Details

type FilDetails struct {
    From_Currency    string
    To_Currency   string
    Daily_Rate   string
    Invoice_Number   string
    PO_Number string
    Transaction_Hash   string   
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
    eventMessage := "{ \"message\" : \"Fil Invoice chaincode is deployed successfully.\", \"code\" : \"200\"}"
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

     if function == "createFilInvoice" { 
        return t.createFilInvoice(stub, args)
    }else if function == "getInvoiceByInvoiceID" { 
        return t.getInvoiceByInvoiceID(stub, args)
    }else if function == "getAllFilInvoice" { 
        return t.getAllFilInvoice(stub, args)
    }else if function == "getAllFilInvoiceByDateRange" { 
        return t.getAllFilInvoiceByDateRange(stub, args)
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
// createFilInvoice - create invoice in Fil , store into chaincode state
// ==================================================================

func (t *Invoices) createFilInvoice(stub shim.ChaincodeStubInterface, args []string) pb.Response {
    var err error

    if len(args) != 74 {
        return shim.Error("Incorrect number of arguments. Expecting 74")
	}

    e1edk01_curcy := args[0]
    e1edk01_hwaer := args[1]
    e1edk01_wkurs := args[2]
    e1edk01_zterm := args[3]
    e1edk01_eigenuinr := args[4]
    e1edk01_bsart := args[5]
    e1edk01_belnr := args[6]
    e1edk01_ntgew := args[7]
    e1edk01_brgew := args[8]
    e1edk01_gewei := args[9]
    e1edk01_fkart_rl := args[10]
    e1edk01_receipient_no := args[11]
    e1edk01_fktyp := args[12]
    e1edka1_parvw0 := args[13]
    e1edka1_partn0 := args[14]
    e1edka1_lifnr0 := args[15]
    e1edka1_name1_0 := args[16]
    e1edka1_name2_0 := args[17]
    e1edka1_stras0 := args[18]
    e1edka1_pfach0 := args[19]
    e1edka1_ort01_0 := args[20]
    e1edka1_pstlz0 := args[21]
    e1edka1_pstl2_0 := args[22]
    e1edka1_land1_0 := args[23]
    e1edka1_spras0 := args[24]
    e1edka1_bname0 := args[25]
    e1edka1_paorg0 := args[26]
    e1edka1_parvw1 := args[27]
    e1edka1_partn1 := args[28]
    e1edka1_lifnr1 := args[29]
    e1edka1_name1_1 := args[30]
    e1edka1_name2_1 := args[31]
    e1edka1_stras1 := args[32]
    e1edka1_pfach1 := args[33]
    e1edka1_ort01_1 := args[34]
    e1edka1_pstlz1 := args[35]
    e1edka1_pstl2_1 := args[36]
    e1edka1_land1_1 := args[37]
    e1edka1_spras1 := args[38]
    e1edka1_ort02_1 := args[39]
    e1edka1_regio_1 := args[40]
    e1edka1_ihrez_1 := args[41]
    e1edka1_ilnnr_1 := args[42]
    e1edka1_spras_iso_1 := args[43]
    e1edk02_qualf := args[44]
    e1edk02_belnr := args[45]
    e1edk02_datum := args[46]
    e1edk17_qualf := args[47]
    e1edk17_lkond := args[48]
    e1edk17_lktext := args[49]
    e1edk18_qualf0 := args[50]
    e1edk18_tage0 := args[51]
    e1edk18_prznt0 := args[52]
    e1edk18_zterm_txt0 := args[53]
    e1edk18_qualf1 := args[54]
    e1edk18_zterm_txt1 := args[55]
    e1edp01_posex := args[56]
    e1edp01_menge := args[57]
    e1edp01_menee := args[58]
    e1edp01_ntgew := args[59]
    e1edp01_gewei := args[60]
    e1edp01_brgew := args[61]
    e1edp01_pstyv := args[62]
    e1edp01_werks := args[63]
    e1edp01_e1edp02_qualf := args[64]
    e1edp01_e1edp02_belnr := args[65]
    e1edp01_e1edp02_datum := args[66]
    e1edp01_e1edp26_qualf := args[67]
    e1edp01_e1edp26_betrg := args[68]
    e1eds01_sumid := args[69]
    e1eds01_summe := args[70]
    e1eds01_waerq := args[71]
    datestring := args[72]
	hash := args[73]
    
    transaction_date, _err := strconv.Atoi(datestring)   //Date 1
    if _err != nil {
		return shim.Error(_err.Error())
	}
    	  // ==== Check if Invoice already exists ====
	  invoiceAsBytes, err := stub.GetState(e1edp01_e1edp02_belnr)
	  if err != nil {
		  return shim.Error("Failed to get invoice: " + err.Error())
	  } else if invoiceAsBytes != nil {
		  fmt.Println("This invoice order already exists: " + e1edp01_e1edp02_belnr)
		  return shim.Error("This invoice order already exists: " + e1edp01_e1edp02_belnr)
	  }

	  
    // ====marshal to JSON ====
	invoice := &Invoice{e1edk01_curcy,e1edk01_hwaer,e1edk01_wkurs,e1edk01_zterm,e1edk01_eigenuinr,e1edk01_bsart,e1edk01_belnr,e1edk01_ntgew,e1edk01_brgew,
        e1edk01_gewei,e1edk01_fkart_rl,e1edk01_receipient_no,e1edk01_fktyp,e1edka1_parvw0,e1edka1_partn0,e1edka1_lifnr0,e1edka1_name1_0,e1edka1_name2_0,e1edka1_stras0,e1edka1_pfach0,e1edka1_ort01_0,e1edka1_pstlz0,e1edka1_pstl2_0,e1edka1_land1_0,e1edka1_spras0,
        e1edka1_bname0,e1edka1_paorg0,e1edka1_parvw1,e1edka1_partn1,e1edka1_lifnr1,e1edka1_name1_1,e1edka1_name2_1,e1edka1_stras1,
        e1edka1_pfach1,e1edka1_ort01_1,e1edka1_pstlz1,e1edka1_pstl2_1,e1edka1_land1_1,e1edka1_spras1,e1edka1_ort02_1,e1edka1_regio_1,e1edka1_ihrez_1,e1edka1_ilnnr_1,e1edka1_spras_iso_1,e1edk02_qualf,e1edk02_belnr,e1edk02_datum,e1edk17_qualf,e1edk17_lkond,
        e1edk17_lktext,e1edk18_qualf0,e1edk18_tage0,e1edk18_prznt0,e1edk18_zterm_txt0,e1edk18_qualf1,e1edk18_zterm_txt1,e1edp01_posex,e1edp01_menge,e1edp01_menee,e1edp01_ntgew,e1edp01_gewei,e1edp01_brgew,e1edp01_pstyv,e1edp01_werks,e1edp01_e1edp02_qualf,e1edp01_e1edp02_belnr,
        e1edp01_e1edp02_datum,e1edp01_e1edp26_qualf,e1edp01_e1edp26_betrg,e1eds01_sumid,e1eds01_summe,e1eds01_waerq,transaction_date,hash}
	

	invoiceJSONasBytes, err := json.Marshal(invoice)
    if err != nil {
        return shim.Error(err.Error())
    }
   
    // === Save product to state ===
    err = stub.PutState(e1edp01_e1edp02_belnr, invoiceJSONasBytes)
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
    invoiceIndex = append(invoiceIndex, e1edp01_e1edp02_belnr)
    //add "e1edp01_e1edp02_belnr" to index list
    jsonAsBytes, _ := json.Marshal(invoiceIndex)
    //store "e1edp01_e1edp02_belnr" of invoice
    err = stub.PutState(InvIndexStr, jsonAsBytes)
    if err != nil {
        return shim.Error(err.Error())
    }

    eventMessage := "{ \"e1edp01_e1edp02_belnr\" : \""+e1edp01_e1edp02_belnr+"\", \"message\" : \"Invoice created succcessfully\", \"code\" : \"200\"}"
    err = stub.SetEvent("evtsender", []byte(eventMessage))
    if err != nil {
        return shim.Error(err.Error())
    }
	    // ==== Invoice is saved and indexed. Return success ====
		fmt.Println("- end createInvoice")
		return shim.Success(invoiceJSONasBytes)

}


// ============================================================
// getInvoiceByInvoiceID -  query a invoice by purchase order
// ============================================================
func (t *Invoices) getInvoiceByInvoiceID(stub shim.ChaincodeStubInterface, args []string) pb.Response {
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
        jsonResp = "{\"Invoice Order Number\": \""+ bstnr + "\", \"Error\":\"invoice  does not exist.\"}"
        return shim.Error(jsonResp)
    }

    return shim.Success(valAsbytes)
}


// ===================================================================================
// getAllFilInvoice - Get all invoice  of Fil
// ===================================================================================
func (t *Invoices) getAllFilInvoice(stub shim.ChaincodeStubInterface, args []string) pb.Response {

	if len(args) != 0 {
		return shim.Error("No arguements required")
    }
    
	var jsonResp, errResp string
	var err error
	var InvoiceIndex []string

	fmt.Println("- start getAllFilInvoice")
	Invoice_Bytes, err := stub.GetState(InvIndexStr)
	if err != nil {
		return shim.Error("Failed to get Fil Invoice Request index")
	}
	fmt.Print("Invoice_Bytes : ")
	fmt.Println(Invoice_Bytes)
	json.Unmarshal(Invoice_Bytes, &InvoiceIndex)		//unstringify it aka JSON.parse()
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
        
        invoice := Invoice{}
       json.Unmarshal(valueAsBytes, &invoice)
       
		fmt.Print("invoice : ")
		fmt.Println(invoice)
        // jsonResp = jsonResp + "\""+ val + "\":" + string(valueAsBytes[:])
       // temp ="{\"From_Currency\":"+invoice.E1edk01_curcy+",\"To_Currency:\"+
        temp := FilDetails{
            From_Currency:    invoice.E1edk01_curcy,
            To_Currency:   invoice.E1edk01_hwaer,
            Daily_Rate:      invoice.E1edk01_wkurs,
            Invoice_Number: invoice.E1edk01_belnr,
            PO_Number: invoice.E1edp01_e1edp02_belnr,
            Transaction_Hash: invoice.Transaction_hash,
        }
       //var jsonData []byte
        jsonData, err := json.Marshal(temp)
        if err != nil {
            fmt.Println(err)
        }
        fmt.Println(string(jsonData))
        jsonResp = jsonResp + string(jsonData[:])
		if i < len(InvoiceIndex)-1 {
			jsonResp = jsonResp + ","
		}
	}
	jsonResp = jsonResp + "]"
	fmt.Println("jsonResp : " + jsonResp)
	fmt.Println("end getAllFilInvoice")
	tosend := "Event send"
                        err = stub.SetEvent("evtsender", []byte(tosend))
                        if err != nil {
                            return shim.Error(err.Error())
                        }
	return shim.Success([]byte(jsonResp))
}



// ===================================================================================
// getAllFilInvoiceByDateRange - Get all invoice  of Fil by Date Range
// ===================================================================================
func (t *Invoices) getAllFilInvoiceByDateRange(stub shim.ChaincodeStubInterface, args []string) pb.Response {

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

	fmt.Println("- start getAllFilInvoiceByDateRange")
	Invoice_Bytes, err := stub.GetState(InvIndexStr)
	if err != nil {
		return shim.Error("Failed to get Fil Invoice Request index")
	}
	fmt.Print("Invoice_Bytes : ")
	fmt.Println(Invoice_Bytes)
	json.Unmarshal(Invoice_Bytes, &InvoiceIndex)		//unstringify it aka JSON.parse()
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
        
        invoice := Invoice{}
       json.Unmarshal(valueAsBytes, &invoice)
       
		fmt.Print("invoice : ")
        fmt.Println(invoice)
        
        if (invoice.Transaction_date >= Date1 &&  invoice.Transaction_date <= Date2) {
                // jsonResp = jsonResp + "\""+ val + "\":" + string(valueAsBytes[:])
            // temp ="{\"From_Currency\":"+invoice.E1edk01_curcy+",\"To_Currency:\"+
                temp := FilDetails{
                    From_Currency:    invoice.E1edk01_curcy,
                    To_Currency:   invoice.E1edk01_hwaer,
                    Daily_Rate:      invoice.E1edk01_wkurs,
                    Invoice_Number: invoice.E1edk01_belnr,
                    PO_Number: invoice.E1edp01_e1edp02_belnr,
                    Transaction_Hash: invoice.Transaction_hash,
                }
            //var jsonData []byte
                jsonData, err := json.Marshal(temp)
                if err != nil {
                    fmt.Println(err)
                }
                fmt.Println(string(jsonData))
                jsonResp = jsonResp + string(jsonData[:])
                if i < len(InvoiceIndex)-1 {
                    jsonResp = jsonResp + ","
                }
         }
	}
	jsonResp = jsonResp + "]"
	fmt.Println("jsonResp : " + jsonResp)
	fmt.Println("end getAllFilInvoice")
	tosend := "Event send"
                        err = stub.SetEvent("evtsender", []byte(tosend))
                        if err != nil {
                            return shim.Error(err.Error())
                        }
	return shim.Success([]byte(jsonResp))
}