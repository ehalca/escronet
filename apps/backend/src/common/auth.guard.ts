import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { DataSource } from "typeorm";
import { User } from "../entities/user.entity";
import { FirebaseService } from "../modules/firebase/firebase.service";
import { SKIP_AUTH_KEY, type AuthRequest } from "./current-user.decorator";

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly firebase: FirebaseService,
    private readonly dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(SKIP_AUTH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<AuthRequest>();
    const raw = req.headers["authorization"];
    const authHeader = Array.isArray(raw) ? raw[0] : raw;

    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing Bearer token");
    }
    const idToken = authHeader.slice(7).trim();

    if (!this.firebase.isReady) {
      throw new UnauthorizedException("Authentication service unavailable");
    }

    let firebaseUid: string;
    try {
      const decoded = await this.firebase.auth().verifyIdToken(idToken);
      firebaseUid = decoded.uid;
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      console.error(`[FirebaseAuthGuard] verifyIdToken failed code=${code ?? "unknown"}:`, err);
      throw new UnauthorizedException("Invalid or expired token");
    }

    const user = await this.dataSource
      .getRepository(User)
      .findOneBy({ firebaseUid });

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    req.userId = user.id;
    req.firebaseUid = firebaseUid;
    return true;
  }
}
