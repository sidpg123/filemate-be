import { z } from 'zod';
export const clientSchema = z.object({
    name: z.string().min(2, "Client name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    phoneNumber: z.string().optional(),
    professionalId: z.string().uuid("Invalid Professional ID"),
});
