import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export const authRouter = createTRPCRouter({
  // Protected endpoint: Get current user's password status
  getPasswordStatus: protectedProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { hashedPassword: true },
    });

    return {
      hasPassword: !!user?.hashedPassword,
    };
  }),

  // Public endpoint: Check if user exists and has password
  checkUserStatus: publicProcedure
    .input(
      z.object({
        email: z.string().email("Invalid email address"),
      })
    )
    .query(async ({ input }) => {
      // Return early if email is skip token (shouldn't happen due to enabled flag, but safety check)
      if (!input.email || input.email === "skip@validation.com") {
        return {
          exists: false,
          hasPassword: false,
        };
      }

      const user = await prisma.user.findUnique({
        where: { email: input.email },
        select: {
          id: true,
          hashedPassword: true,
        },
      });

      return {
        exists: !!user,
        hasPassword: !!user?.hashedPassword,
      };
    }),

  // Protected endpoint: Set initial password (for users without password)
  setPassword: protectedProcedure
    .input(
      z.object({
        password: z.string().min(8, "Password must be at least 8 characters"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = await prisma.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { hashedPassword: true },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      if (user.hashedPassword) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Password already set. Use change password instead.",
        });
      }

      const hashedPassword = await bcrypt.hash(input.password, 10);

      await prisma.user.update({
        where: { id: ctx.session.user.id },
        data: { hashedPassword },
      });

      return { success: true };
    }),

  // Protected endpoint: Change existing password
  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1, "Current password is required"),
        newPassword: z.string().min(8, "Password must be at least 8 characters"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = await prisma.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { hashedPassword: true },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      if (!user.hashedPassword) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No password set. Use set password instead.",
        });
      }

      // Verify current password
      const isValid = await bcrypt.compare(
        input.currentPassword,
        user.hashedPassword
      );

      if (!isValid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Current password is incorrect",
        });
      }

      // Hash and update new password
      const hashedPassword = await bcrypt.hash(input.newPassword, 10);

      await prisma.user.update({
        where: { id: ctx.session.user.id },
        data: { hashedPassword },
      });

      return { success: true };
    }),
});

