
const SupplyChain = artifacts.require("SupplyChain");
const truffleAssert = require('truffle-assertions');

contract("Coffe supply chain", async (accounts) => {
  //Supply chain roles
  const owner = accounts[0];
  const originFarmerID = accounts[1];
  const distributorID = accounts[2];
  const retailerID = accounts[3];
  const consumerID = accounts[4];
  //Item general info
  const upc = 1;
  const originFarmName = "David Farmer";
  const originFarmInformation = "Farmer Info";
  const originFarmLatitude = "694x93"; 
  const originFarmLongitude = "904x37";
  const productNotes = "Harvest by david";
  let itemState = {
    Harvested: 0,
    Processed: 1,
    Packed: 2,
    ForSale: 3,
    Sold: 4,
    Shipped: 5,
    Received: 6,
    Purchased: 7,
  };
  //Product price representation in Wei
  const productPrice = web3.utils.toWei('1', "ether");
  
  //Contract main instance
  let deployedInstance;

  beforeEach(async() => {
    deployedInstance = await SupplyChain.deployed()
  })

  it("Testing harvestItem() method", async () => {
    const farmer = accounts[1];
    //Add farmer
    await deployedInstance.addFarmer(originFarmerID);
    //Harvest Item;
    const tx = await deployedInstance.harvestItem(
      upc, 
      originFarmerID, 
      originFarmName, 
      originFarmInformation, 
      originFarmLatitude, 
      originFarmLongitude, 
      productNotes,
      { from: originFarmerID }
    );
    //Get item by upc
    const data = await deployedInstance.fetchItemBufferOne(upc);
    const dataTwo = await deployedInstance.fetchItemBufferTwo(upc);
    
    truffleAssert.eventEmitted(tx, 'Harvested', (ev) => {
      //Handler and compare by bignumber instances
      return web3.utils.toBN(ev.upc).eq(web3.utils.toBN(1));
    }, 'Harvested event was emitted with NO correct parameters');
    
    assert.equal(data.itemSKU, 1);
    assert.equal(data.itemUPC, upc);
    assert.equal(data.ownerID, originFarmerID);
    assert.equal(data.originFarmerID, originFarmerID);
    assert.equal(data.originFarmName, originFarmName);
    assert.equal(data.originFarmInformation, originFarmInformation);
    assert.equal(data.originFarmLatitude, originFarmLatitude);
    assert.equal(data.originFarmLongitude, originFarmLongitude);
    assert.equal(dataTwo.itemState, itemState.Harvested);
  });

  it("Testing processItem() method", async () => {
    const tx = await deployedInstance.processItem(upc, { from: originFarmerID });
    truffleAssert.eventEmitted(tx, 'Processed', (ev) => {
      //Handler and compare by bignumber instances
      return web3.utils.toBN(ev.upc).eq(web3.utils.toBN(1));
    }, 'Processed event was emitted with NO correct parameters');
    
    const data = await deployedInstance.fetchItemBufferTwo(upc);
    assert.equal(data.itemState, itemState.Processed);
  });

  it("Testing packItem() method", async () => {
    const tx = await deployedInstance.packItem(upc, {from: originFarmerID});
    truffleAssert.eventEmitted(tx, 'Packed', (ev) => {
      //Handler and compare by bignumber instances
      return web3.utils.toBN(ev.upc).eq(web3.utils.toBN(1));
    }, 'Processed event was emitted with NO correct parameters');
    
    const data = await deployedInstance.fetchItemBufferTwo(upc);
    assert.equal(data.itemState, itemState.Packed);
  });

  it("Testing sellItem() method", async () => {
    const tx = await deployedInstance.sellItem(
      upc, 
      productPrice, 
      { from: originFarmerID }
    );
    truffleAssert.eventEmitted(tx, 'ForSale', (ev) => {
      //Handler and compare by bignumber instances
      return web3.utils.toBN(ev.upc).eq(web3.utils.toBN(1));
    }, 'Processed event was emitted with NO correct parameters');
    
    const data = await deployedInstance.fetchItemBufferTwo(upc);
    assert.equal(data.itemState, itemState.ForSale);
    assert.equal(data.productPrice, productPrice);
  });

  it("Testing buyItem() method", async () => {
    await deployedInstance.addDistributor(distributorID);
    const farmerInitialBalance = await web3.eth.getBalance(originFarmerID);
    const DistributorInitialBalance = await web3.eth.getBalance(distributorID);
    //Check even emition
    const tx = await deployedInstance.buyItem(
      upc,  
      { from: distributorID, value: productPrice, gasPrice: 0}
    );
    truffleAssert.eventEmitted(tx, 'Sold', (ev) => {
      //Handler and compare by bignumber instances
      return web3.utils.toBN(ev.upc).eq(web3.utils.toBN(1));
    }, 'Processed event was emitted with NO correct parameters');
    
    //Check if the product info was updated after purchase
    const data = await deployedInstance.fetchItemBufferOne(upc);
    const dataTwo = await deployedInstance.fetchItemBufferTwo(upc);
    assert.equal(data.ownerID, distributorID);
    assert.equal(dataTwo.distributorID, distributorID);
    assert.equal(dataTwo.itemState, itemState.Sold);

    //Check if the balances info was updated after purchase
    const farmerBalanceAfterBuy = await web3.eth.getBalance(originFarmerID);
    const DistributorBalanceAfterBuy = await web3.eth.getBalance(distributorID);

    assert.equal(Number(farmerInitialBalance) + Number(productPrice), farmerBalanceAfterBuy);
    assert.equal(Number(DistributorInitialBalance) - Number(productPrice), DistributorBalanceAfterBuy);
  });

  it("Testing shipItem() method", async () => {
    const tx = await deployedInstance.shipItem(
      upc, 
      { from: distributorID }
    );
    truffleAssert.eventEmitted(tx, 'Shipped', (ev) => {
      //Handler and compare by bignumber instances
      return web3.utils.toBN(ev.upc).eq(web3.utils.toBN(1));
    }, 'Processed event was emitted with NO correct parameters');
    
    const data = await deployedInstance.fetchItemBufferTwo(upc);
    assert.equal(data.itemState, itemState.Shipped);
  });

  it("Testing receiveItem() method", async () => {
    await deployedInstance.addRetailer(retailerID)
    const tx = await deployedInstance.receiveItem(
      upc, 
      { from: retailerID }
    );
    truffleAssert.eventEmitted(tx, 'Received', (ev) => {
      //Handler and compare by bignumber instances
      return web3.utils.toBN(ev.upc).eq(web3.utils.toBN(1));
    }, 'Processed event was emitted with NO correct parameters');
    
    const data = await deployedInstance.fetchItemBufferOne(upc);
    const dataTwo = await deployedInstance.fetchItemBufferTwo(upc);
    assert.equal(data.ownerID, retailerID);
    assert.equal(dataTwo.retailerID, retailerID);
    assert.equal(dataTwo.itemState, itemState.Received);
  });

  it("Testing purchaseItem() method", async () => {
    const retailerInitialBalance = await web3.eth.getBalance(retailerID);
    const consumerInitialBalance = await web3.eth.getBalance(consumerID);
    await deployedInstance.addConsumer(consumerID);
    const tx = await deployedInstance.purchaseItem(
      upc, 
      { from: consumerID, value: productPrice, gasPrice: 0 }
    );
    truffleAssert.eventEmitted(tx, 'Purchased', (ev) => {
      //Handler and compare by bignumber instances
      return web3.utils.toBN(ev.upc).eq(web3.utils.toBN(1));
    }, 'Processed event was emitted with NO correct parameters');

    //Check if product info was updated
    const data = await deployedInstance.fetchItemBufferOne(upc);
    const dataTwo = await deployedInstance.fetchItemBufferTwo(upc);
    assert.equal(data.ownerID, consumerID);
    assert.equal(dataTwo.consumerID, consumerID);
    assert.equal(dataTwo.itemState, itemState.Purchased);

    //Check if balance was updated
    const retailerBalanceAfterBuy = await web3.eth.getBalance(retailerID);
    const consumerBalanceAfterBuy = await web3.eth.getBalance(consumerID);

    assert.equal(Number(retailerInitialBalance) + Number(productPrice), retailerBalanceAfterBuy);
    assert.equal(Number(consumerInitialBalance) - Number(productPrice), consumerBalanceAfterBuy);
  });

  it("Testing fetchItemBufferOne() method", async () => {
    
    //Get item by upc
    const data = await deployedInstance.fetchItemBufferOne(upc);
    
    assert.equal(data.itemSKU, 1);
    assert.equal(data.itemUPC, upc);
    assert.equal(data.ownerID, consumerID);
    assert.equal(data.originFarmerID, originFarmerID);
    assert.equal(data.originFarmName, originFarmName);
    assert.equal(data.originFarmInformation, originFarmInformation);
    assert.equal(data.originFarmLatitude, originFarmLatitude);
    assert.equal(data.originFarmLongitude, originFarmLongitude);
  });

  it("Testing fetchItemBufferTwo() method", async () => {
    
    //Get item by upc
    const data = await deployedInstance.fetchItemBufferTwo(upc);
    assert.equal(data.itemSKU, 1);
    assert.equal(data.itemUPC,upc);
    assert.equal(data.productID, 1 + upc);
    assert.equal(data.productNotes, productNotes);
    assert.equal(data.productPrice, productPrice);
    assert.equal(data.itemState, itemState.Purchased);
    assert.equal(data.distributorID, distributorID);
    assert.equal(data.retailerID, retailerID);
    assert.equal(data.consumerID, consumerID);
  });
})
