import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

type AuthRequest = {
  headers: Record<string, string | string[] | undefined>;
  userId?: string;
};

@Injectable()
export class BearerAuthGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<AuthRequest>();
    const raw = req.headers["authorization"];
    const auth = Array.isArray(raw) ? raw[0] : raw;
    if (!auth?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing Bearer token");
    }
    const token = auth.slice(7).trim();
    if (!token) throw new UnauthorizedException("Empty token");
    req.userId = token;
    return true;
  }
}

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest<AuthRequest>();
    return req.userId!;
  },
);
