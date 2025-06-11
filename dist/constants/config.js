const corsOptions = {
    origin: [
        "http://localhost:3000",
        process.env.CLIENT_URL || 'http://localhost:3000',
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
};
const TOKEN = "authjs.session-token";
export { corsOptions, TOKEN };
