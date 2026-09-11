export class AuthError extends Error { constructor(public readonly code: string, message: string) { super(message); } }
export class InvalidCredentialsError extends AuthError { constructor() { super("INVALID_CREDENTIALS", "Email ou mot de passe incorrect."); } }
export class UnauthenticatedError extends AuthError { constructor() { super("UNAUTHENTICATED", "Authentification requise."); } }
export class EmailAlreadyUsedError extends AuthError { constructor() { super("EMAIL_ALREADY_USED", "Cette adresse email est déjà utilisée."); } }
export class InvalidCurrentPasswordError extends AuthError { constructor() { super("INVALID_CURRENT_PASSWORD", "Le mot de passe actuel est incorrect."); } }
