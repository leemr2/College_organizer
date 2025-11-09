import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, adminProcedure, publicProcedure } from "../trpc";
import { prisma } from "@/lib/db";

export const adminRouter = createTRPCRouter({
  // Public endpoint: Request access
  requestAccess: publicProcedure
    .input(
      z.object({
        email: z.string().email("Invalid email address"),
      })
    )
    .mutation(async ({ input }) => {
      // Check if email is already on allowlist
      const existingAllowlist = await prisma.allowlist.findUnique({
        where: { email: input.email },
      });

      if (existingAllowlist) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This email already has access",
        });
      }

      // Check if there's already a pending request
      const existingRequest = await prisma.accessRequest.findUnique({
        where: { email: input.email },
      });

      if (existingRequest) {
        if (existingRequest.status === "pending") {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Access request already pending",
          });
        }
        // If rejected, allow re-requesting
        if (existingRequest.status === "rejected") {
          return await prisma.accessRequest.update({
            where: { email: input.email },
            data: {
              status: "pending",
              requestedAt: new Date(),
              rejectedAt: null,
              approvedAt: null,
              approvedBy: null,
              notes: null,
            },
          });
        }
      }

      // Create new access request
      return await prisma.accessRequest.create({
        data: {
          email: input.email,
          status: "pending",
        },
      });
    }),

  // Admin: Get all access requests
  getAccessRequests: adminProcedure
    .input(
      z
        .object({
          status: z.enum(["pending", "approved", "rejected"]).optional(),
        })
        .optional()
    )
    .query(async ({ input, ctx }) => {
      const where = input?.status ? { status: input.status } : {};
      return await prisma.accessRequest.findMany({
        where,
        orderBy: { requestedAt: "desc" },
      });
    }),

  // Admin: Approve access request
  approveAccessRequest: adminProcedure
    .input(
      z.object({
        id: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const request = await prisma.accessRequest.findUnique({
        where: { id: input.id },
      });

      if (!request) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Access request not found",
        });
      }

      if (request.status === "approved") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Request already approved",
        });
      }

      // Update request status
      await prisma.accessRequest.update({
        where: { id: input.id },
        data: {
          status: "approved",
          approvedAt: new Date(),
          approvedBy: ctx.session.user.id,
          notes: input.notes,
        },
      });

      // Add to allowlist
      await prisma.allowlist.upsert({
        where: { email: request.email },
        create: {
          email: request.email,
        },
        update: {},
      });

      return { success: true };
    }),

  // Admin: Reject access request
  rejectAccessRequest: adminProcedure
    .input(
      z.object({
        id: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const request = await prisma.accessRequest.findUnique({
        where: { id: input.id },
      });

      if (!request) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Access request not found",
        });
      }

      if (request.status === "rejected") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Request already rejected",
        });
      }

      return await prisma.accessRequest.update({
        where: { id: input.id },
        data: {
          status: "rejected",
          rejectedAt: new Date(),
          approvedBy: ctx.session.user.id,
          notes: input.notes,
        },
      });
    }),

  // Admin: Get all allowlist entries
  getAllowlist: adminProcedure.query(async () => {
    return await prisma.allowlist.findMany({
      orderBy: { createdAt: "desc" },
    });
  }),

  // Admin: Add email to allowlist directly
  addToAllowlist: adminProcedure
    .input(
      z.object({
        email: z.string().email("Invalid email address"),
      })
    )
    .mutation(async ({ input }) => {
      // Check if already on allowlist
      const existing = await prisma.allowlist.findUnique({
        where: { email: input.email },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Email already on allowlist",
        });
      }

      return await prisma.allowlist.create({
        data: {
          email: input.email,
        },
      });
    }),

  // Admin: Remove email from allowlist
  removeFromAllowlist: adminProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return await prisma.allowlist.delete({
        where: { id: input.id },
      });
    }),

  // Admin: Get stats
  getStats: adminProcedure.query(async () => {
    const [totalRequests, pendingRequests, approvedRequests, rejectedRequests, allowlistCount] =
      await Promise.all([
        prisma.accessRequest.count(),
        prisma.accessRequest.count({ where: { status: "pending" } }),
        prisma.accessRequest.count({ where: { status: "approved" } }),
        prisma.accessRequest.count({ where: { status: "rejected" } }),
        prisma.allowlist.count(),
      ]);

    return {
      totalRequests,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      allowlistCount,
    };
  }),
});

