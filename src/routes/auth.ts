import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import { getMyProfile, googleLogin, login, refreshToken, register } from "../controllers/auth.controller.js";

const app = express.Router()


// app.use(isAuthenticated)

app.get('/me', isAuthenticated, getMyProfile)
app.post('/login', login)
app.post('/register', register)
app.post('/refresh', refreshToken);
app.post('/google-login', googleLogin);

export default app;