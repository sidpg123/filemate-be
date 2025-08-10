import TryCatch, { getStorageByPlan } from "../lib/healpers";
import { instance } from "../config/razorpay";
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

export const hasActiveSubscription = TryCatch(async (req, res, next) => {
    const userId = req.user?.id;
    const subscription = await db.subscription.findFirst({
        where: {
            userId: userId as string,
            status: 'active'
        }
    })
    res.json({ hasActiveSubscription: !!subscription });

})

export const paymentVerification = TryCatch(async (req, res, next) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    // //console.log("Inside paymentVerification")
    const body = razorpay_order_id + "|" + razorpay_payment_id;


    if (!process.env.RAZORPAY_KEY_SECRET) {
        return next(new ErrorHandler("Razorpay API secret is not configured", 500));
    }

    // //console.log("Razorpay API secret is configured", process.env.RAZORPAY_KEY_SECRET);      
    const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
        console.error("❌ Payment verification failed:", {
            razorpay_order_id,
            razorpay_payment_id
        });

        try {
            const refund = await instance.payments.refund(razorpay_payment_id, {
                speed: "optimum" // or "instant" if you have it enabled
            });
            console.log("✅ Refund initiated for failed verification:", refund.id);
        } catch (refundError) {
            console.error("⚠️ Refund initiation failed:", refundError);
        }

        return next(new ErrorHandler("Payment verification failed, refund initiated", 400));
    }

    const razorpayOrder = await instance.orders.fetch(razorpay_order_id);
    const planId = razorpayOrder.notes?.plan || "Unknown";
    const userId = razorpayOrder.notes?.userId || "Unknown";
    const expiresAt = razorpayOrder.notes?.expiresAt;

    if (!planId || !userId || !expiresAt) {
        return next(new ErrorHandler("Invalid payment metadata", 400));
    }

    //console.log("planId", planId);
    // //console.log("creating subscription");

    // //console.log("Subscription created")
    await db.$transaction(async (tx) => {

        const user = await tx.user.findUnique({
            where: {
                id: userId as string,
            },
            select: { storageUsed: true, allocatedStorage: true }
        })

        if (!user) throw new ErrorHandler("User not found", 404);

        const storageAllocated = BigInt(getStorageByPlan(planId as string)) + BigInt(user?.allocatedStorage!);

        await tx.user.update({
            where: {
                id: userId as string
            },
            data: {
                allocatedStorage: storageAllocated
            }
        })

        await db.subscription.create({
            data: {
                userId: userId as string,
                planId: planId as string,
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature,
                status: 'active',
                expiresAt: new Date(expiresAt!),
                createdAt: new Date(),
            }
        })

        res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
    })

})

export const getRazorpayKey = TryCatch(async (req, res, next) => {
    //console.log("getRazorpayKey called");
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
        },
        select: {
            id: true,
            planId: true,
            status: true,
            razorpay_order_id: true,
            razorpay_payment_id: true,
            razorpay_signature: true,
            startDate: true,
            expiresAt: true,
            createdAt: true,
            cancelledAt: true,
            plan: {
                select: {
                    name: true,
                    displayName: true,
                    features: true,
                    price: true,
                }
            }
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