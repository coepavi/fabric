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

var DelIndexStr = "_invid" 



// Attributes of a Invoice
type Invoice struct {
    Belnr string `json:"belnr"`
    Gjahr string `json:"gjahr"`
	Bukrs string `json:"bukrs"`
	Lifnr string `json:"lifnr"`
	Budat string `json:"budat"`
	Menge string `json:"menge"`
	Rmwwr string `json:"rmwwr"`
	Waers string `json:"waers"`
	Kursf string `json:"kursf"`
	Ebeln string `json:"ebeln"`
	Ebelp string `json:"ebelp"`
	Matnr string `json:"matnr"`
	Werks string `json:"werks"` 
    Transaction_date int `json:"date"`
    Transaction_hash string `json:"transaction_hash"`
	}


//Pil Details

type PilDetails struct {
    Invoice_Number    string
    Fiscal_Year   string
    Company_Code   string
    Material_Number   string
    Plant string
	Purchase_Order string
	Quantity string
	Amount string
	Currency string
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
    err = stub.PutState(DelIndexStr, jsonAsBytes)
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

    // Handle different functions
    if function == "createInvoice" { //create a new Invoice
        return t.createInvoice(stub, args)
	}else if function == "getInvoiceByPurchaseID" { //find Invoice for a particular purchase id using rich query
        return t.getInvoiceByPurchaseID(stub, args)
    }else if function == "getAllPILInvoice" { //find Invoice for a particular purchase id using rich query
        return t.getAllPILInvoice(stub, args)
    } else if function == "getAllPILInvoiceDate" { //find Invoice for a particular purchase id using rich query
        return t.getAllPILInvoiceDate(stub, args)
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

    if len(args) != 15 {
        return shim.Error("Incorrect number of arguments. Expecting 15")
	}
	
	belnr := args[0]			//invoice number
	gjahr := args[1]		
	bukrs := args[2]	
	lifnr := args[3]	
	budat := args[4]	
    menge := args[5]
    rmwwr := args[6]    
    waers := args[7]
	kursf := args[8]
	ebeln := args[9]			//its purchase order number
	ebelp := args[10]
	matnr := args[11]
	werks := args[12]
    datestring := args[13]
	hash := args[14]

	  // ==== Check if Invoice already exists ====
	  invoiceAsBytes, err := stub.GetState(belnr)
	  if err != nil {
		  return shim.Error("Failed to get invoice: " + err.Error())
	  } else if invoiceAsBytes != nil {
		  fmt.Println("This purchase order already exists: " + belnr)
		  return shim.Error("This purchase order already exists: " + belnr)
	  }
      transaction_date, _err := strconv.Atoi(datestring)   //Date 1
      if _err != nil {
          return shim.Error(_err.Error())
      }
	  
    // ====marshal to JSON ====
	invoice := &Invoice{belnr,gjahr,bukrs,lifnr,budat,menge,rmwwr,waers,kursf,ebeln,ebelp,matnr,werks,transaction_date,hash}
	

	invoiceJSONasBytes, err := json.Marshal(invoice)
    if err != nil {
        return shim.Error(err.Error())
    }
   
    // === Save product to state ===
    err = stub.PutState(belnr, invoiceJSONasBytes)
    if err != nil {
        return shim.Error(err.Error())
    }

    //get the invoice index
    invoiceIndexAsBytes, err := stub.GetState(DelIndexStr)
    if err != nil {
        return shim.Error(err.Error())
    }
    var invoiceIndex []string

    json.Unmarshal(invoiceIndexAsBytes, &invoiceIndex)                          //un stringify it aka JSON.parse()
    fmt.Print("invoiceIndex: ")
    fmt.Println(invoiceIndex)
    //append
    invoiceIndex = append(invoiceIndex, belnr)
    fmt.Print("invoice Index after appending == ",invoiceIndex)
    //add "belnr" to index list
    jsonAsBytes, _ := json.Marshal(invoiceIndex)
    //store "belnr" of invoice
    err = stub.PutState(DelIndexStr, jsonAsBytes)
    if err != nil {
        return shim.Error(err.Error())
    }

    eventMessage := "{ \"belnr\" : \""+belnr+"\", \"message\" : \"invoice created succcessfully\", \"code\" : \"200\"}"
    err = stub.SetEvent("evtsender", []byte(eventMessage))
    if err != nil {
        return shim.Error(err.Error())
    }
	    // ==== invoice is saved and indexed. Return success  ====
		fmt.Println("- end createinvoice")
		return shim.Success(invoiceJSONasBytes)
}





// ============================================================
// getInvoiceByPurchaseID -  query a Invoice by purchase order
// ============================================================
func (t *Invoices) getInvoiceByPurchaseID(stub shim.ChaincodeStubInterface, args []string) pb.Response {
    var  jsonResp string

    if len(args) != 1 {
        return shim.Error("Incorrect number of arguments. Expecting purchase order number of the Invoice to query")
    }

    belnr := args[0]
    valAsbytes, err := stub.GetState(belnr) 
    if err != nil {
        jsonResp = "{\"Error\":\"Failed to get state for " + belnr + "\"}"
        return shim.Error(jsonResp)
    } else if valAsbytes == nil {
        jsonResp = "{\"Purchase Order Number\": \""+ belnr + "\", \"Error\":\"Invoice  does not exist.\"}"
        return shim.Error(jsonResp)
    }

    return shim.Success(valAsbytes)
}




// ===================================================================================
// getAllPILInvoice - Get all invoice  of PIL
// ===================================================================================
func (t *Invoices) getAllPILInvoice(stub shim.ChaincodeStubInterface, args []string) pb.Response {

	if len(args) != 0 {
		return shim.Error("No arguements required")
    }
    
	var jsonResp, errResp string
	var err error
	var InvoiceIndex []string

	fmt.Println("- start getAllPILInvoice")
	Invoice_Bytes, err := stub.GetState(DelIndexStr)
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
        temp := PilDetails{
			    Invoice_Number:  invoice.Belnr,
				Fiscal_Year:   	invoice.Gjahr,
				Company_Code:   invoice.Bukrs,
				Material_Number:   invoice.Matnr,
				Plant:  invoice.Werks,
				Purchase_Order: invoice.Ebeln,
				Quantity: invoice.Menge,
				Amount: invoice.Rmwwr,
				Currency: invoice.Waers,
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
// getAllPILInvoiceDate - Get all invoice  of PIL
// ===================================================================================
func (t *Invoices) getAllPILInvoiceDate(stub shim.ChaincodeStubInterface, args []string) pb.Response {

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

	fmt.Println("- start getAllPILInvoiceDate")
	Invoice_Bytes, err := stub.GetState(DelIndexStr)
	if err != nil {
		return shim.Error("Failed to get PIL Invoice Request index")
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
		fmt.Println(strconv.Itoa(i) + " - looking at " + val + " for all Reg request")
		valueAsBytes, err := stub.GetState(val)
		if err != nil {
			errResp = "{\"Error\":\"Failed to get state for  " + val + "\"}"
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
	// if sz > 0 && jsonResp[sz] == ',' { 
	// 	jsonResp = jsonResp[:sz-1]
	// }
	jsonResp = jsonResp + "]"
	fmt.Println("jsonResp : " + jsonResp)
	fmt.Println("end getAllPILInvoice")
	tosend := "Event send"
                        err = stub.SetEvent("evtsender", []byte(tosend))
                        if err != nil {
                            return shim.Error(err.Error())
                        }
	return shim.Success([]byte(jsonResp))
}