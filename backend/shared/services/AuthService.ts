// Authentication Service Implementation
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { IAuthService, IEmailService, ICacheService } from '@/shared/interfaces/services';
import { IUser } from '@/interfaces/IUser';
import { LoginDto, RegisterDto } from '@/interfaces/IDto';
import { HTTP_STATUS, BUSINESS_STATUS } from '@/shared/statusCodes';

export class AuthService implements IAuthService {
  private jwtSecret: string;
  private jwtRefreshSecret: string;
  private emailService: IEmailService;
  private cacheService: ICacheService;

  constructor(
    jwtSecret: string,
    jwtRefreshSecret: string,
    emailService: IEmailService,
    cacheService: ICacheService
  ) {
    this.jwtSecret = jwtSecret;
    this.jwtRefreshSecret = jwtRefreshSecret;
    this.emailService = emailService;
    this.cacheService = cacheService;
  }

  async register(userData: RegisterDto): Promise<{ user: Partial<IUser>; tokens: any }> {
    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 12);
    
    // Create user (this would use repository pattern)
    const user = {
      ...userData,
      password: hashedPassword,
      isEmailVerified: false,
      isActive: true
    } as Partial<IUser>;

    // Generate tokens
    const tokens = await this.generateTokens(user.id!);

    // Send verification email
    await this.emailService.sendVerificationEmail(userData.email, tokens.verificationToken);

    return { user, tokens };
  }

  async login(credentials: LoginDto): Promise<{ user: Partial<IUser>; tokens: any }> {
    // Validate credentials (this would use repository)
    // For now, returning mock structure
    const user = {} as Partial<IUser>;
    const tokens = await this.generateTokens(user.id!);
    
    return { user, tokens };
  }

  async validateToken(token: string): Promise<any> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      return decoded;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  async refreshToken(refreshToken: string): Promise<any> {
    try {
      const decoded = jwt.verify(refreshToken, this.jwtRefreshSecret);
      const newTokens = await this.generateTokens(decoded.userId);
      return newTokens;
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  async logout(token: string): Promise<void> {
    // Add token to blacklist
    const decoded = jwt.decode(token) as any;
    const blacklistKey = `blacklist_${decoded.userId}`;
    await this.cacheService.set(blacklistKey, token, 3600);
  }

  private async generateTokens(userId: string): Promise<any> {
    const accessToken = jwt.sign({ userId }, this.jwtSecret, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId }, this.jwtRefreshSecret, { expiresIn: '7d' });
    const verificationToken = crypto.randomBytes(32).toString('hex');

    return {
      accessToken,
      refreshToken,
      verificationToken
    };
  }
}