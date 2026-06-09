import { INestApplication } from "@nestjs/common";
import { createAppRouter } from "@escronet/shared";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { AuthService } from "../modules/auth/auth.service";
import { CallersService } from "../modules/callers/callers.service";

export function mountTrpc(app: INestApplication): void {
  const expressApp = app.getHttpAdapter().getInstance();
  const authService = app.get(AuthService);
  const callersService = app.get(CallersService);

  const appRouter = createAppRouter({
    auth: authService,
    callers: callersService,
  });

  expressApp.use(
    "/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext: () => ({}),
    }),
  );
}
