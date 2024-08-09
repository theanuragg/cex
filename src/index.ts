import express, { Request, Response, NextFunction } from 'express';

const app = express();
app.use(express.json());

interface UserBalance {
  ethBalance: number;
  usdBalance: number;
}

const userBalances: { [userId: string]: UserBalance } = {};

function validateAmounts(req: Request, res: Response, next: NextFunction) {
  const { ethAmount, usdAmount, quantity } = req.body;
  if ((ethAmount && ethAmount <= 0) || (usdAmount && usdAmount <= 0) || (quantity && quantity <= 0)) {
    return res.status(400).json({ message: 'Invalid ETH, USD amount, or quantity' });
  }
  next();
}

app.post('/add-liquidity', validateAmounts, (req: Request, res: Response) => {
  const { userId, ethAmount, usdAmount } = req.body;
  if (!userBalances[userId]) {
    userBalances[userId] = { ethBalance: 0, usdBalance: 0 };
  }
  
  userBalances[userId].ethBalance += ethAmount;
  userBalances[userId].usdBalance += usdAmount;

  res.json({
    message: `Liquidity added: ${ethAmount} ETH and ${usdAmount} USD. New balances - ETH: ${userBalances[userId].ethBalance}, USD: ${userBalances[userId].usdBalance}`
  });
});

app.post('/buy-asset', validateAmounts, (req: Request, res: Response) => {
  const { userId, quantity } = req.body;
  if (!userBalances[userId]) {
    return res.status(400).json({ message: 'User not found' });
  }

  const { ethBalance, usdBalance } = userBalances[userId];
  const product = ethBalance * usdBalance;
  const updatedEthBalance = ethBalance - quantity;

  if (updatedEthBalance <= 0) {
    return res.status(400).json({ message: 'Not enough ETH balance' });
  }

  const updatedUsdBalance = product / updatedEthBalance;
  const paidAmount = updatedUsdBalance - usdBalance;

  userBalances[userId].ethBalance = updatedEthBalance;
  userBalances[userId].usdBalance = updatedUsdBalance;

  res.json({ message: `You got ${paidAmount.toFixed(2)} USD for ${quantity} ETH` });
});

app.post('/sell-asset', validateAmounts, (req: Request, res: Response) => {
  const { userId, quantity } = req.body;
  if (!userBalances[userId]) {
    return res.status(400).json({ message: 'User not found' });
  }

  const { ethBalance, usdBalance } = userBalances[userId];
  const updatedUsdBalance = usdBalance - quantity;

  if (updatedUsdBalance <= 0) {
    return res.status(400).json({ message: 'Not enough USD balance' });
  }

  const updatedEthBalance = ethBalance + (ethBalance * usdBalance) / updatedUsdBalance;
  const paidAmount = updatedEthBalance - ethBalance;

  userBalances[userId].ethBalance = updatedEthBalance;
  userBalances[userId].usdBalance = updatedUsdBalance;

  res.json({ message: `You got ${paidAmount.toFixed(2)} ETH for ${quantity} USD` });
});

app.post('/quote', (req: Request, res: Response) => {
  const { userId, type, quantity } = req.body;
  if (!type || !quantity || quantity <= 0 || !userBalances[userId]) {
    return res.status(400).json({ message: 'Invalid type, quantity, or user not found' });
  }

  const { ethBalance, usdBalance } = userBalances[userId];
  const product = ethBalance * usdBalance;
  if (type === 'buy') {
    const updatedEthBalance = ethBalance - quantity;
    if (updatedEthBalance <= 0) {
      return res.status(400).json({ message: 'Not enough ETH balance' });
    }
    const updatedUsdBalance = product / updatedEthBalance;
    const quote = updatedUsdBalance - usdBalance;
    return res.json({ message: `Quote: ${quote.toFixed(2)} USD for ${quantity} ETH` });
  } else if (type === 'sell') {
    const updatedUsdBalance = usdBalance - quantity;
    if (updatedUsdBalance <= 0) {
      return res.status(400).json({ message: 'Not enough USD balance' });
    }
    const updatedEthBalance = ethBalance + (ethBalance * usdBalance) / updatedUsdBalance;
    const quote = updatedEthBalance - ethBalance;
    return res.json({ message: `Quote: ${quote.toFixed(2)} ETH for ${quantity} USD` });
  } else {
    return res.status(400).json({ message: 'Invalid type' });
  }
});

type Order = { userId: string, type: string, quantity: number, price: number };
const buyOrders: Order[] = [];
const sellOrders: Order[] = [];
const transactions: any[] = [];

app.post('/place-order', (req: Request, res: Response) => {
  const { userId, type, quantity, price } = req.body;

  if (!userId || !type || !quantity || !price || quantity <= 0 || price <= 0) {
    return res.status(400).json({ message: 'Invalid order parameters' });
  }

  const newOrder: Order = { userId, type, quantity, price };

  if (type === 'buy') {
    buyOrders.push(newOrder);
    buyOrders.sort((a, b) => b.price - a.price);
  } else if (type === 'sell') {
    sellOrders.push(newOrder);
    sellOrders.sort((a, b) => a.price - b.price);
  } else {
    return res.status(400).json({ message: 'Invalid order type' });
  }

  res.json({ message: 'Order placed successfully', order: newOrder });
});

app.get('/order-book', (req: Request, res: Response) => {
  res.json({ buyOrders, sellOrders });
});

app.post('/match-orders', (req: Request, res: Response) => {
  const matchedOrders = [];

  while (buyOrders.length && sellOrders.length && buyOrders[0].price >= sellOrders[0].price) {
    const buyOrder = buyOrders[0];
    const sellOrder = sellOrders[0];

    const matchedQuantity = Math.min(buyOrder.quantity, sellOrder.quantity);
    const transactionPrice = (buyOrder.price + sellOrder.price) / 2;

    matchedOrders.push({
      buyOrder: { ...buyOrder, quantity: matchedQuantity },
      sellOrder: { ...sellOrder, quantity: matchedQuantity },
      transactionPrice,
    });

    buyOrder.quantity -= matchedQuantity;
    sellOrder.quantity -= matchedQuantity;

    if (buyOrder.quantity === 0) buyOrders.shift();
    if (sellOrder.quantity === 0) sellOrders.shift();
  }

  res.json({ matchedOrders });
});

app.get('/transaction-history/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;
  const userTransactions = transactions.filter(
    (transaction) => transaction.buyerId === userId || transaction.sellerId === userId
  );
  res.json({ userTransactions });
});

app.listen(3000, () => {
  console.log('CEX server is running on port 3000');
});
  
  