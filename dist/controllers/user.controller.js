import TryCatch from "../lib/healpers";
export const getMyProfile = TryCatch(async (req, res, next) => {
    // const user = await User.findById(req.user);
    // if (!user) return next(new ErrorHandler("User not found", 404));
    res.status(200).json({
        success: true,
        message: "Hello"
    });
});
