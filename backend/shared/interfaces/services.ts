// Service interfaces following SOLID principles

export interface IAuthService {
  register(userData: any): Promise<any>;
  login(credentials: any): Promise<any>;
  validateToken(token: string): Promise<any>;
  refreshToken(refreshToken: string): Promise<any>;
  logout(token: string): Promise<void>;
  updateProfile(userId: string, data: any): Promise<any>;
}

export interface IEmailService {
  sendVerificationEmail(email: string, token: string): Promise<void>;
  sendPasswordResetEmail(email: string, token: string): Promise<void>;
  sendNotificationEmail(email: string, subject: string, content: string): Promise<void>;
}

export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface IMessageQueueService {
  publish(exchange: string, routingKey: string, message: any): Promise<void>;
  subscribe(queue: string, callback: (message: any) => void): Promise<void>;
  createChannel(): Promise<any>;
}

export interface IFileService {
  upload(file: Express.Multer.File): Promise<string>;
  delete(filePath: string): Promise<void>;
  compressImage(imagePath: string): Promise<string>;
  generateThumbnail(imagePath: string): Promise<string>;
}

export interface IValidationService {
  validateEmail(email: string): boolean;
  validatePhone(phone: string): boolean;
  validatePassword(password: string): boolean;
  sanitizeInput(input: string): string;
}