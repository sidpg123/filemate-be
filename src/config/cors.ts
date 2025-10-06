import cors from 'cors'
const corsOptions: cors.CorsOptions = {
    origin: [
      "http://localhost:3000",
      process.env.CLIENT_URL || 'http://localhost:3000',
      'https://www.filesmate.in/'
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  };
  
  const TOKEN = "authjs.session-token";
  
  export { corsOptions, TOKEN };