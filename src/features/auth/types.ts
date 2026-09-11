export interface User { id: string; displayName: string; email: string; createdAt: string; }
export interface Credentials { email: string; password: string; }
export interface Registration extends Credentials { displayName: string; }
