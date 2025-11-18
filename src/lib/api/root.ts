import { createCallerFactory, createTRPCRouter } from "./trpc";
import { studentRouter } from "./routers/studentRouter";
import { taskRouter } from "./routers/taskRouter";
import { chatRouter } from "./routers/chatRouter";
import { adminRouter } from "./routers/adminRouter";
import { toolRouter } from "./routers/toolRouter";
import { scheduleRouter } from "./routers/scheduleRouter";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  student: studentRouter,
  task: taskRouter,
  chat: chatRouter,
  admin: adminRouter,
  tool: toolRouter,
  schedule: scheduleRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
