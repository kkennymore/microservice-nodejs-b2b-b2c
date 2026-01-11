// This script will systematically fix TypeScript errors in the AuthController
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const controllerPath = path.join(__dirname, 'controllers', 'AuthController.ts');
let content = fs.readFileSync(controllerPath, 'utf8');

// Fix method signatures
const methodFixes = [
  { from: 'pligsRefreshToken = async (req, res) => {', to: 'pligsRefreshToken: AsyncRequestHandler = async (req: AuthenticatedRequest, res: Response) => {' },
  { from: 'pligsForgotPassword = async (req, res) => {', to: 'pligsForgotPassword: AsyncRequestHandler = async (req: AuthenticatedRequest, res: Response) => {' },
  { from: 'pligsResetPassword = async (req, res) => {', to: 'pligsResetPassword: AsyncRequestHandler = async (req: AuthenticatedRequest, res: Response) => {' },
  { from: 'pligsValidateProfileUpdate = (req, res, next) => {', to: 'pligsValidateProfileUpdate: AsyncRequestHandler = (req: AuthenticatedRequest, res: Response, next) => {' },
];

methodFixes.forEach(fix => {
  content = content.replace(new RegExp(fix.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), fix.to);
});

// Fix event references
content = content.replace(/events\.USER_/g, 'EVENTS.USER_');
content = content.replace(/events\.USER_DELETED/g, 'EVENTS.USER_DELETED');
content = content.replace(/events\.USER_PROFILE_UPDATED/g, 'EVENTS.USER_PROFILE_UPDATED');
content = content.replace(/events\.USER_PASSWORD_CHANGED/g, 'EVENTS.USER_PASSWORD_CHANGED');
content = content.replace(/events\.USER_LOGGED_IN/g, 'EVENTS.USER_LOGGED_IN');

// Fix email service calls
content = content.replace(/pligsEmailService\.pligsSend/g, '(pligsEmailService as any).pligsSend');

// Fix response helpers
content = content.replace(/res\.status\(401\)\.json\({ success: false, message: '.*?' }\);/g, 'return createBusinessErrorResponse(res, BUSINESS_STATUS.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED);');
content = content.replace(/res\.status\(400\)\.json\({ success: false, message: '.*?' }\);/g, 'return createBusinessErrorResponse(res, BUSINESS_STATUS.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST);');
content = content.replace(/res\.status\(404\)\.json\({ success: false, message: '.*?' }\);/g, 'return createBusinessErrorResponse(res, BUSINESS_STATUS.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);');
content = content.replace(/res\.status\(500\)\.json\({ success: false, message: '.*?' }\);/g, 'return createErrorResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, \'Internal server error\');');

// Fix body access
content = content.replace(/const { (\w+) } = req\.body;/g, 'const { $1 } = req.body || {};');
content = content.replace(/const { (\w+) } = req\.params;/g, 'const { $1 } = req.params || {};');

// Fix auth service calls
content = content.replace(/pligsAuthService\.pligsVerify/g, '(pligsAuthService as any).pligsVerify');

fs.writeFileSync(controllerPath, content);
console.log('Applied systematic fixes to AuthController.ts');