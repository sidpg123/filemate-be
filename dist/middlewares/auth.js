import TryCatch from "../lib/healpers";
import { ErrorHandler } from "../lib/utils";
const isAuthenticated = TryCatch(async (req, _res, next) => {
    console.log(req.cookies); // ✅ Log all cookies
    const token = req.cookies["authjs.session-token"]; // ✅ Extract NextAuth session token
    console.log(token);
    if (!token)
        return next(new ErrorHandler("Please login to access this route", 401));
    try {
        const { decode } = await import("@auth/core/jwt"); // ✅ Use dynamic import
        const session = await decode({
            token,
            secret: process.env.AUTH_SECRET,
            salt: "authjs.session-token"
        });
        if (!session)
            return next(new ErrorHandler("Invalid session token", 401));
        req.user = {
            id: session.sub, // NextAuth stores user ID in `sub`
            email: session.email,
            // role: session.role!, // Default role
        };
        next();
    }
    catch (error) {
        console.log(error);
        return next(new ErrorHandler("Session decoding failed", 401));
    }
});
export { isAuthenticated };
