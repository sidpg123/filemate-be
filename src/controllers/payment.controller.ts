import TryCatch from "../lib/healpers";
import { instance } from "../app";
import crypto from "crypto"
import db from '../lib/db';
import { ErrorHandler } from "../lib/utils";

export const checkout = TryCatch(async (req, res, next) => {
    const userId = req.user?.id!;
    const { plan, amount, expiresAt } = req.body;
    if (!plan || !amount) {
        return next(new ErrorHandler("Plan and amount are required", 401))
    }
    const options = {
        amount: Number(amount * 100),
        currency: "INR",  
        receipt: `receipt_${Date.now()}`,
        notes: {
            userId,
            plan, // attach the plan name here
            expiresAt
        },
    };

    const order = await instance.orders.create(options);

    res.status(200).json({
        success: true,
        order
    })
});

export const paymentVerification = TryCatch(async (req, res, next) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;


    if (!process.env.RAZORPAY_KEY_SECRET) {
        return next(new ErrorHandler("Razorpay API secret is not configured", 500));
    }

    console.log("Razorpay API secret is configured", process.env.RAZORPAY_KEY_SECRET);      
    const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) return next(new ErrorHandler("Payment verification failed", 400));

    const razorpayOrder = await instance.orders.fetch(razorpay_order_id);
    const planName = razorpayOrder.notes?.plan || "Unknown";
    const userId = razorpayOrder.notes?.userId || "Unknown";
    const expiresAt = razorpayOrder.notes?.expiresAt;
   

    const payment = await db.subscription.create({
        data: {
            userId: userId as string,
            plan: planName as string,
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            status: 'success',
            expiresAt: new Date(expiresAt!),
            createdAt: new Date(),
        }
    })


    res.redirect(`${process.env.FRONTEND_URL}/payment-status?success=${isAuthentic}&razorpay_order_id=${razorpay_order_id}`);

})

export const getRazorpayKey = TryCatch(async (req, res, next) => {
    console.log("getRazorpayKey called");
    res.status(201).json({
        key: process.env.RAZORPAY_KEY_ID
    })
})

export const getSubscription = TryCatch(async (req, res, next) => {
    const userId = req.user?.id!;
    if (!userId) {
        return next(new ErrorHandler("User not found", 404));
    }

    const subscription = await db.subscription.findFirst({
        where: {
            userId: userId as string
        }
    });

    if (!subscription) {
        return next(new ErrorHandler("No subscription found for this user", 404));
    }

    res.status(200).json({
        success: true,
        subscription
    });
})