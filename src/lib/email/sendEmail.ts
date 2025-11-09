import { Resend } from "resend";
import { WelcomeEmail } from "./templates/WelcomeEmail";
import { AccessApprovedEmail } from "./templates/AccessApprovedEmail";
import { createElement } from "react";

const resend = new Resend(process.env.RESEND_API_KEY || "");

export async function sendWelcomeEmail(to: string, name: string) {
  await resend.emails.send({
    from: process.env.EMAIL_FROM || "no-reply@yourdomain.com",
    to,
    subject: "Welcome!",
    react: createElement(WelcomeEmail, { name }),
  });
}

export async function sendAccessApprovedEmail(to: string) {
  if (!process.env.RESEND_API_KEY) {
    return;
  }

  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || "no-reply@yourdomain.com",
      to,
      subject: "Your Scout Access Has Been Approved! 🎉",
      react: createElement(AccessApprovedEmail, { email: to }),
    });
  } catch (error) {
    // Don't throw - we don't want to fail the approval if email fails
  }
}
