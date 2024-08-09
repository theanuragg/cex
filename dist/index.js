"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
let ETH_BALANCE = 200;
let USD_BALANCE = 70000;
app.post("/add.liquidty", (req, res) => {
});
app.post("/buy-assest", (req, res) => {
    const product = ETH_BALANCE * USD_BALANCE;
    const quantity = req.body.quantity;
    const updateethquantity = ETH_BALANCE - quantity;
    const updateusdquantity = ETH_BALANCE * USD_BALANCE / updateethquantity;
    const paidamount = updateusdquantity - USD_BALANCE;
    ETH_BALANCE = updateethquantity;
    USD_BALANCE = updateusdquantity;
    res.json({
        message: `You got ${paidamount} ETH for ${quantity} USD`
    });
});
app.post("/sell-assest", (req, res) => {
    const quantity = req.body.quantity;
    const updateusdbalance = USD_BALANCE - quantity;
    const updatedethbalance = ETH_BALANCE + USD_BALANCE / updateusdbalance;
    const paidamount = updatedethbalance - ETH_BALANCE;
    ETH_BALANCE = updatedethbalance;
    USD_BALANCE = updateusdbalance;
    res.json({
        message: `You got ${paidamount} ETH for ${quantity} USD`
    });
});
app.post("/quote", (req, res) => {
});
app.listen(3000);
