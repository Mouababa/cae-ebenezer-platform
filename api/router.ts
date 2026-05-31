import { authRouter } from "./auth-router";
import { userRouter } from "./routers/user-router";
import { bookingRouter } from "./routers/booking-router";
import { machineRouter } from "./routers/machine-router";
import { analyticsRouter } from "./routers/analytics-router";
import { localAuthRouter } from "./routers/local-auth-router";
import { auditRouter } from "./routers/audit-router";
import { settingsRouter } from "./routers/settings-router";
import { googleRouter } from "./routers/google-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  localAuth: localAuthRouter,
  user: userRouter,
  booking: bookingRouter,
  machine: machineRouter,
  analytics: analyticsRouter,
  audit: auditRouter,
  settings: settingsRouter,
  google: googleRouter,
});

export type AppRouter = typeof appRouter;
