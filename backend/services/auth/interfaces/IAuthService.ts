import { IUser } from '@/IUser';
import { LoginDto, RegisterDto, SocialLoginDto, TokenResponse, UpdateProfileDto, KycSubmitDto } from '@/IDto';

export interface IAuthService {
  pligsGenerateTokens(user: IUser): Promise<TokenResponse>;
  pligsVerifyPassword(password: string, hash: string): Promise<boolean>;
  pligsHashPassword(password: string): Promise<string>;
  pligsGenerateOTP(): Promise<string>;
  pligsVerifyOTP(secret: string, token: string): Promise<boolean>;
  pligsSendEmail(to: string, subject: string, html: string): Promise<void>;
  pligsSendSms(to: string, message: string): Promise<void>;
  pligsLogin(dto: LoginDto): Promise<TokenResponse>;
  pligsRegister(dto: RegisterDto): Promise<IUser>;
  pligsSocialLogin(dto: SocialLoginDto): Promise<TokenResponse>;
  pligsUpdateProfile(userId: string, dto: UpdateProfileDto): Promise<IUser>;
  pligsSubmitKyc(userId: string, dto: KycSubmitDto): Promise<IUser>;
  // Add more methods as needed
}