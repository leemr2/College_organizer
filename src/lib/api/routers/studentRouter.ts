import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/db";

export const studentRouter = createTRPCRouter({
  // Create student profile during onboarding
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        year: z.string().optional(),
        biggestChallenge: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check if student already exists
      const existingStudent = await prisma.student.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (existingStudent) {
        // Update existing student instead of creating new one
        const student = await prisma.student.update({
          where: { userId: ctx.session.user.id },
          data: {
            name: input.name,
            year: input.year,
            biggestChallenge: input.biggestChallenge,
          },
        });
        return student;
      }

      // Validate email is present
      if (!ctx.session.user.email) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Email is required to create student profile",
        });
      }

      // Create new student
      try {
        const student = await prisma.student.create({
          data: {
            userId: ctx.session.user.id,
            name: input.name,
            email: ctx.session.user.email,
            year: input.year,
            biggestChallenge: input.biggestChallenge,
          },
        });
        return student;
      } catch (error: any) {
        // Handle unique constraint violations
        if (error.code === "P2002") {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A student profile with this email already exists",
          });
        }
        // Re-throw other errors
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to create student profile",
        });
      }
    }),

  // Get current student profile
  me: protectedProcedure.query(async ({ ctx }) => {
    const student = await prisma.student.findUnique({
      where: { userId: ctx.session.user.id },
      include: {
        preferences: true,
        classSchedules: true,
      },
    });

    return student;
  }),

  // Update preferences
  updatePreferences: protectedProcedure
    .input(
      z.object({
        peakEnergyTimes: z.array(z.string()).optional(),
        preferredBreakLength: z.number().optional(),
        morningPerson: z.boolean().optional(),
        studyAloneVsGroup: z.string().optional(),
        notificationSettings: z.any().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const student = await prisma.student.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!student) throw new Error("Student not found");

      const preferences = await prisma.studentPreferences.upsert({
        where: { studentId: student.id },
        update: input,
        create: {
          studentId: student.id,
          ...input,
        },
      });

      return preferences;
    }),

  // Complete onboarding
  completeOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
    const student = await prisma.student.update({
      where: { userId: ctx.session.user.id },
      data: { onboardingComplete: true },
    });

    return student;
  }),
});

