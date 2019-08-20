package main

import (
    "fmt"
    "strconv"
    "encoding/json"
    "github.com/hyperledger/fabric/core/chaincode/shim"
    pb "github.com/hyperledger/fabric/protos/peer"
)

// Delivery implements a simple chaincode to manage Delivery
type Deliverys struct {
}

var DelIndexStr = "_drid"  
var InvIndexStr = "_invid"



// Attributes of a Delivery
type Delivery struct {
    Xabln string `json:"xabln"`
    Matnr string `json:"matnr"`
	Bstnr string `json:"bstnr"`
	Qualf1 string `json:"qualf1"`
	Belnr1 string `json:"belnr1"`
	Qualf2 string `json:"qualf2"`
    Belnr2 string `json:"belnr2"`
    Transaction_date int `json:"date"`
}



// ===================================================================================
// Main
// ===================================================================================
func main() {
    err := shim.Start(new(Deliverys))
    if err != nil {
        fmt.Printf("Error starting Delivery chaincode: %s", err)
    }
}



// ===========================
// Init initializes chaincode
// ===========================
func (t *Deliverys) Init(stub shim.ChaincodeStubInterface) pb.Response {
    var empty []string
    var err error
    jsonAsBytes, _ := json.Marshal(empty)                               //marshal an emtpy array of strings to clear the index
    err = stub.PutState(DelIndexStr, jsonAsBytes)
    if err != nil {
        return shim.Error(err.Error())
    }
    eventMessage := "{ \"message\" : \"Delivery chaincode is deployed successfully.\", \"code\" : \"200\"}"
    err = stub.SetEvent("evtsender", []byte(eventMessage))
    if err != nil {
        return shim.Error(err.Error())
    }
    return shim.Success(nil)
}


// ========================================
// Invoke - Our entry point for Invocations
// ========================================
func (t *Deliverys) Invoke(stub shim.ChaincodeStubInterface) pb.Response {
    function, args := stub.GetFunctionAndParameters()
    fmt.Println("invoke is running " + function)

    // Handle different functions
    if function == "createDelivery" { //create a new Delivery
        return t.createDelivery(stub, args)
	}else if function == "getDeliveryByPurchaseID" { //find delivery for a particular purchase id using rich query
        return t.getDeliveryByPurchaseID(stub, args)
    }else if function == "getAllDAPDelivery" { //find delivery for a particular purchase id using rich query
        return t.getAllDAPDelivery(stub, args)
    } else if function == "getAllDAPDeliveryDate" { //find delivery for a particular purchase id using rich query
        return t.getAllDAPDeliveryDate(stub, args)
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
// createDelivery - create a new Delivery, store into chaincode state
// ==================================================================

func (t *Deliverys) createDelivery(stub shim.ChaincodeStubInterface, args []string) pb.Response {
    var err error

    if len(args) != 8 {
        return shim.Error("Incorrect number of arguments. Expecting 8")
	}
	
	xabln := args[0]	
	matnr := args[1]	
	bstnr := args[2]	
	qualf1 := args[3]	
	belnr1 := args[4]	
	qualf2 := args[5]	
    belnr2 := args[6]
    datestring := args[7]

	  // ==== Check if Delivery already exists ====
	  deliveryAsBytes, err := stub.GetState(bstnr)
	  if err != nil {
		  return shim.Error("Failed to get delivery: " + err.Error())
	  } else if deliveryAsBytes != nil {
		  fmt.Println("This purchase order already exists: " + bstnr)
		  return shim.Error("This purchase order already exists: " + bstnr)
	  }
      transaction_date, _err := strconv.Atoi(datestring)   //Date 1
      if _err != nil {
          return shim.Error(_err.Error())
      }
	  
    // ====marshal to JSON ====
	delivery := &Delivery{xabln,matnr,bstnr,qualf1,belnr1,qualf2,belnr2,transaction_date}
	

	deliveryJSONasBytes, err := json.Marshal(delivery)
    if err != nil {
        return shim.Error(err.Error())
    }
   
    // === Save product to state ===
    err = stub.PutState(bstnr, deliveryJSONasBytes)
    if err != nil {
        return shim.Error(err.Error())
    }

    //get the delivery index
    deliveryIndexAsBytes, err := stub.GetState(DelIndexStr)
    if err != nil {
        return shim.Error(err.Error())
    }
    var deliveryIndex []string

    json.Unmarshal(deliveryIndexAsBytes, &deliveryIndex)                          //un stringify it aka JSON.parse()
    fmt.Print("deliveryIndex: ")
    fmt.Println(deliveryIndex)
    //append
    deliveryIndex = append(deliveryIndex, bstnr)
    fmt.Print("Delivery Index after appending == ",deliveryIndex)
    //add "bstnr" to index list
    jsonAsBytes, _ := json.Marshal(deliveryIndex)
    //store "bstnr" of Delivery
    err = stub.PutState(DelIndexStr, jsonAsBytes)
    if err != nil {
        return shim.Error(err.Error())
    }

    eventMessage := "{ \"BSTNR\" : \""+bstnr+"\", \"message\" : \"Delivery created succcessfully\", \"code\" : \"200\"}"
    err = stub.SetEvent("evtsender", []byte(eventMessage))
    if err != nil {
        return shim.Error(err.Error())
    }
	    // ==== Delivery is saved and indexed. Return success  ====
		fmt.Println("- end createDelivery")
		return shim.Success(deliveryJSONasBytes)
}





// ============================================================
// getDeliveryByPurchaseID -  query a Delivery by purchase order
// ============================================================
func (t *Deliverys) getDeliveryByPurchaseID(stub shim.ChaincodeStubInterface, args []string) pb.Response {
    var  jsonResp string

    if len(args) != 1 {
        return shim.Error("Incorrect number of arguments. Expecting purchase order number of the Delivery to query")
    }

    bstnr := args[0]
    valAsbytes, err := stub.GetState(bstnr) 
    if err != nil {
        jsonResp = "{\"Error\":\"Failed to get state for " + bstnr + "\"}"
        return shim.Error(jsonResp)
    } else if valAsbytes == nil {
        jsonResp = "{\"Purchase Order Number\": \""+ bstnr + "\", \"Error\":\"Delivery  does not exist.\"}"
        return shim.Error(jsonResp)
    }

    return shim.Success(valAsbytes)
}




// ===================================================================================
// getAllDAPDelivery - Get all invoice  of DAP
// ===================================================================================
func (t *Deliverys) getAllDAPDelivery(stub shim.ChaincodeStubInterface, args []string) pb.Response {

	if len(args) != 0 {
		return shim.Error("No arguements required")
    }
    
	var jsonResp, errResp string
	var err error
	var DeliveryIndex []string

	fmt.Println("- start getAllDAPDelivery")
	Delivery_Bytes, err := stub.GetState(DelIndexStr)
	if err != nil {
		return shim.Error("Failed to get DAP Delivery Request index")
	}
	fmt.Print("Delivery_Bytes : ")
	fmt.Println(Delivery_Bytes)
	json.Unmarshal(Delivery_Bytes, &DeliveryIndex)		//un stringify it aka JSON.parse()
	fmt.Print("DeliveryIndex : ")
	fmt.Println(DeliveryIndex)
	fmt.Println("len(DeliveryIndex) : ")
	fmt.Println(len(DeliveryIndex))
	jsonResp = "["
	for i,val := range DeliveryIndex{
		fmt.Println(strconv.Itoa(i) + " - looking at " + val + " for all Reg request")
		valueAsBytes, err := stub.GetState(val)
		if err != nil {
			errResp = "{\"Error\":\"Failed to get state for " + val + "\"}"
			return shim.Error(errResp)
		}
		fmt.Print("valueAsBytes : ")
		fmt.Println(valueAsBytes)
		jsonResp = jsonResp  + string(valueAsBytes[:])
		if i < len(DeliveryIndex)-1 {
			jsonResp = jsonResp + ","
		}
	}
	// sz := len(jsonResp)
	// if sz > 0 && jsonResp[sz] == ',' { 
	// 	jsonResp = jsonResp[:sz-1]
	// }
	jsonResp = jsonResp + "]"
	fmt.Println("jsonResp : " + jsonResp)
	fmt.Println("end getAllDAPDelivery")
	tosend := "Event send"
                        err = stub.SetEvent("evtsender", []byte(tosend))
                        if err != nil {
                            return shim.Error(err.Error())
                        }
	return shim.Success([]byte(jsonResp))
}




// ===================================================================================
// getAllDAPDeliveryDate - Get all invoice  of DAP
// ===================================================================================
func (t *Deliverys) getAllDAPDeliveryDate(stub shim.ChaincodeStubInterface, args []string) pb.Response {

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
	var DeliveryIndex []string

	fmt.Println("- start getAllDAPDeliveryDate")
	Delivery_Bytes, err := stub.GetState(DelIndexStr)
	if err != nil {
		return shim.Error("Failed to get DAP Delivery Request index")
	}
	fmt.Print("Delivery_Bytes : ")
	fmt.Println(Delivery_Bytes)
	json.Unmarshal(Delivery_Bytes, &DeliveryIndex)		//un stringify it aka JSON.parse()
	fmt.Print("DeliveryIndex : ")
	fmt.Println(DeliveryIndex)
	fmt.Println("len(DeliveryIndex) : ")
	fmt.Println(len(DeliveryIndex))
	jsonResp = "["
	for i,val := range DeliveryIndex{
		fmt.Println(strconv.Itoa(i) + " - looking at " + val + " for all Reg request")
		valueAsBytes, err := stub.GetState(val)
		if err != nil {
			errResp = "{\"Error\":\"Failed to get state for " + val + "\"}"
			return shim.Error(errResp)
		}
		fmt.Print("valueAsBytes : ")
        fmt.Println(valueAsBytes)
        
        delivery := Delivery{}
        json.Unmarshal(valueAsBytes, &delivery)
        if (delivery.Transaction_date >= Date1 &&  delivery.Transaction_date <= Date2) {
		jsonResp = jsonResp  + string(valueAsBytes[:])
		if i < len(DeliveryIndex)-1 {
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
	fmt.Println("end getAllDAPDelivery")
	tosend := "Event send"
                        err = stub.SetEvent("evtsender", []byte(tosend))
                        if err != nil {
                            return shim.Error(err.Error())
                        }
	return shim.Success([]byte(jsonResp))
}