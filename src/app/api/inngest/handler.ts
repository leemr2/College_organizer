import { serve } from "inngest/next";
import { inngest } from "@/../inngest.config";

const sendFn = inngest.createFunction(
  { name: "inngest/send", id: "inngest/send" },
  { event: "inngest/send" },
  async ({ event }) => {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log("[Inngest] Event:", event);
    }
  },
);

export const { POST, GET } = serve({
  client: inngest,
  functions: [sendFn],
});
