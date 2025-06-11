import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import { addClient, addFeeRecord, deleteClient, getClientById, getClients, getFeeRecords, updateClient, updateFeeRecord } from "../controllers/client.controller.js";
// import { getMyProfile, login, refreshToken, register } from "../controllers/auth.controller.js";
// import { getClients } from "../controllers/client.controller.js";

const app = express.Router()

/*---

## 👨‍⚖️ **3. Client Management (`/clients`)**

| Method | Route                     | Description                       |
| ------ | ------------------------- | --------------------------------- |
| GET    | `/clients`                | Get all clients of logged-in user |
| POST   | `/clients`                | Add a new client                  |
| GET    | `/clients/:id`            | Get specific client details       |
| PUT    | `/clients/:id`            | Edit client details               |
| DELETE | `/clients/:id`            | Remove client                     |
| PUT    | `/clients/:id/fee-status` | Mark fee as paid/unpaid           |

---
*/
app.use(isAuthenticated)

app.get('/', getClients);
app.post('/', addClient);    
app.get('/:id', getClientById);
app.put('/:id', updateClient);
app.delete('/:id', deleteClient);
app.get('/:id/fee', getFeeRecords);
app.post('/:id/fee', addFeeRecord);
app.put('/:id/fee/:feeId', updateFeeRecord)


export default app;