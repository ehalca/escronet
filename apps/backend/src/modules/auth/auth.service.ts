import { createHash, createPublicKey, createVerify } from "crypto";
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../../entities/user.entity";
import { FirebaseService } from "../firebase/firebase.service";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly firebase: FirebaseService,
  ) {}

  async register(input: {
    registrationJwt: string;
    fcmToken?: string;
  }): Promise<{ customToken: string; userId: string }> {
    if (!this.firebase.isReady) {
      throw new ServiceUnavailableException("Firebase not initialized");
    }

    // --- 1. Split and decode the self-signed JWT ---
    const parts = input.registrationJwt.split(".");
    if (parts.length !== 3) {
      throw new UnauthorizedException("Malformed registration JWT");
    }
    const [headerB64, payloadB64, sigB64] = parts as [string, string, string];

    let payload: { pub: string; iat: number };
    try {
      payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as {
        pub: string;
        iat: number;
      };
    } catch {
      throw new UnauthorizedException("Invalid JWT payload");
    }

    if (typeof payload.pub !== "string" || typeof payload.iat !== "number") {
      throw new UnauthorizedException("JWT payload missing required fields");
    }

    // --- 2. Replay protection: iat must be within ±5 minutes ---
    const nowSecs = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSecs - payload.iat) > 300) {
      throw new UnauthorizedException("JWT expired or clock skew too large");
    }

    // --- 3. Reconstruct public key from SPKI DER (base64url in payload.pub) ---
    let pubKeyDer: Buffer;
    let publicKey: ReturnType<typeof createPublicKey>;
    try {
      pubKeyDer = Buffer.from(payload.pub, "base64url");
      publicKey = createPublicKey({ key: pubKeyDer, format: "der", type: "spki" });
    } catch {
      throw new UnauthorizedException("Invalid public key in JWT");
    }

    // --- 4. Verify ES256 signature ---
    // Try IEEE P1363 first (react-native-quick-crypto default), fall back to DER
    const signingInput = `${headerB64}.${payloadB64}`;
    const sigBytes = Buffer.from(sigB64, "base64url");
    let valid = false;

    for (const dsaEncoding of ["ieee-p1363", "der"] as const) {
      try {
        const v = createVerify("SHA256");
        v.update(signingInput);
        valid = v.verify({ key: publicKey, dsaEncoding }, sigBytes);
        if (valid) break;
      } catch {
        // try next encoding
      }
    }

    if (!valid) {
      throw new UnauthorizedException("Invalid JWT signature");
    }

    // --- 5. Derive deterministic Firebase UID from public key ---
    const firebaseUid =
      "device:" + createHash("sha256").update(pubKeyDer).digest("hex").slice(0, 28);

    this.logger.log(
      `[register] firebaseUid=${firebaseUid} fcmToken=${input.fcmToken ? input.fcmToken.slice(0, 12) + "…" : "none"}`,
    );

    // --- 6. Ensure Firebase Auth user exists ---
    const fbAuth = this.firebase.auth();
    try {
      await fbAuth.getUser(firebaseUid);
      this.logger.log(`[register] Firebase user already exists uid=${firebaseUid}`);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code !== "auth/user-not-found") {
        this.logger.error(`[register] getUser failed code=${code ?? "unknown"}: ${String(err)}`);
        throw err;
      }
      await fbAuth.createUser({ uid: firebaseUid });
      this.logger.log(`[register] Firebase user created uid=${firebaseUid}`);
    }

    // --- 7. Issue Firebase Custom Token ---
    const customToken = await fbAuth.createCustomToken(firebaseUid);

    // --- 8. Upsert Postgres User ---
    let user = await this.userRepo.findOne({ where: { firebaseUid } });
    if (!user) {
      user = this.userRepo.create({ firebaseUid, fcmToken: input.fcmToken ?? null });
      await this.userRepo.save(user);
      this.logger.log(`[register] new user created id=${user.id}`);
    } else if (input.fcmToken && user.fcmToken !== input.fcmToken) {
      user.fcmToken = input.fcmToken;
      await this.userRepo.save(user);
      this.logger.log(`[register] fcmToken updated for user=${user.id}`);
    } else {
      this.logger.log(`[register] existing user id=${user.id} (no change)`);
    }

    return { customToken, userId: user.id };
  }
}
