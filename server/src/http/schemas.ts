import { z } from "zod";

const password = z.string().min(10, "Le mot de passe doit contenir au moins 10 caractères.").max(256, "Le mot de passe est trop long.");
const displayName = z.string().trim().min(1, "Le nom est obligatoire.").max(120, "Le nom est trop long.");
const email = z.string().trim().email("Adresse email invalide.").max(320, "Adresse email invalide.");
export const registerSchema = z.object({ displayName, email, password }).strict();
export const loginSchema = z.object({ email, password: z.string().min(1, "Le mot de passe est obligatoire.") }).strict();
export const profileSchema = z.object({ displayName }).strict();
export const changeEmailSchema = z.object({ newEmail: email, currentPassword: z.string().min(1) }).strict();
export const changePasswordSchema = z.object({ currentPassword: z.string().min(1), newPassword: password }).strict();
export const deleteAccountSchema = z.object({ currentPassword: z.string().min(1) }).strict();
