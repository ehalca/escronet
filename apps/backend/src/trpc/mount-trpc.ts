import { INestApplication } from "@nestjs/common";
import { createAppRouter } from "@escronet/shared";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { AuthService } from "../modules/auth/auth.service";

export function mountTrpc(app: INestApplication): void {
  const expressApp = app.getHttpAdapter().getInstance();
  const authService = app.get(AuthService);
  const appRouter = createAppRouter(authService);

  expressApp.use(
    "/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext: () => ({}),
    }),
  );
}
