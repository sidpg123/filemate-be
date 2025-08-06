import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import { addClient, addFeeRecord, deleteClient, deleteFeeRecord, getClientById, getClients, getDocuments, getFeeRecords, getFeeStatistics, updateClient, updateFeeRecord, uploadDocMetaData } from "../controllers/client.controller.js";
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
// app.get('/sortbyfees', getClientsSortedByFees);
app.post('/', addClient);    
app.get('/:id', getClientById);
app.put('/:id', updateClient);
app.delete('/:id', deleteClient);
app.get('/:id/fees', getFeeRecords);
app.get('/:id/fees/statistics', getFeeStatistics);
app.post('/:id/fees', addFeeRecord);
app.put('/:id/fees/:feeId', updateFeeRecord);
app.delete('/:id/fees/:feeId', deleteFeeRecord);


app.get('/:id/document', getDocuments)
app.post('/document', uploadDocMetaData);


export default app;