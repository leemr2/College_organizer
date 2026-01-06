import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, adminProcedure, publicProcedure } from "../trpc";
import { prisma } from "@/lib/db";
import { sendAccessApprovedEmail } from "@/lib/email/sendEmail";
import bcrypt from "bcryptjs";

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

      // Check if there's already an access request
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
        // If rejected or approved (but removed from allowlist), allow re-requesting
        if (existingRequest.status === "rejected" || existingRequest.status === "approved") {
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
    .query(async ({ input }) => {
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

      // Send approval email (don't fail if email fails)
      try {
        await sendAccessApprovedEmail(request.email);
      } catch {
        // Continue even if email fails
      }

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

  // Admin: Get users by emails (for password status checking)
  getUsersByEmails: adminProcedure
    .input(
      z.object({
        emails: z.array(z.string().email("Invalid email address")),
      })
    )
    .query(async ({ input }) => {
      const users = await prisma.user.findMany({
        where: {
          email: {
            in: input.emails,
          },
        },
        select: {
          id: true,
          email: true,
          name: true,
          hashedPassword: true,
        },
      });

      // Return users with password status
      return users.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        hasPassword: !!user.hashedPassword,
      }));
    }),

  // Admin: Set password for a user (only if they don't have one)
  setUserPassword: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        password: z.string().min(8, "Password must be at least 8 characters"),
      })
    )
    .mutation(async ({ input }) => {
      // Find user
      const user = await prisma.user.findUnique({
        where: { id: input.userId },
        select: { hashedPassword: true },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Check if user already has a password
      if (user.hashedPassword) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User already has a password set",
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(input.password, 10);

      // Update user
      await prisma.user.update({
        where: { id: input.userId },
        data: { hashedPassword },
      });

      return { success: true };
    }),
});

