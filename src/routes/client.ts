import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import { addClient, addFeeRecord, deleteClient, deleteFeeRecord, getClientById, getClients, getDocuments, getFeeRecords, getFeeStatistics, updateClient, updateFeeRecord, uploadDocMetaData } from "../controllers/client.controller.js";
import { authorizeRoles } from "@/middlewares/role.js";

const app = express.Router()


app.use(isAuthenticated)
app.use(authorizeRoles('CA'))
app.get('/', getClients);
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