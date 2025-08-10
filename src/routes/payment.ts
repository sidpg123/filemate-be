import express from 'express';
import { isAuthenticated } from '../middlewares/auth.js';
import { checkout, getRazorpayKey, getSubscription, hasActiveSubscription, paymentVerification } from '../controllers/payment.controller.js';

const app = express.Router();

app.post('/paymentverification', paymentVerification);

app.use(isAuthenticated)

app.post('/checkout', checkout);
app.get('/getKey', getRazorpayKey);
app.get('/subscriptions', getSubscription);
app.get('/subscription/status', hasActiveSubscription );

export default app;