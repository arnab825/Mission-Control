import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Subscriber from "@/models/Subscriber";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Invalid email address provided." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Connect DB & Save Subscriber
    let subscriberDoc = null;
    try {
      await connectDB();
      subscriberDoc = await Subscriber.findOneAndUpdate(
        { email: cleanEmail },
        { email: cleanEmail, status: "active", source: "footer_newsletter", subscribedAt: new Date() },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } catch (dbError: any) {
      console.warn("MongoDB subscription save failed (operating in fallback mode):", dbError.message);
    }

    // 2. Dispatch Welcome Telemetry Email via Nodemailer (or Ethereal fallback)
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    let transporter;

    if (host && user && pass) {
      transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    } else {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }

    const mailOptions = {
      from: `"Mission Control Telemetry" <noreply@missioncontrol.gg>`,
      to: cleanEmail,
      subject: "Mission Control Telemetry Feed Subscribed",
      text: `Operator registered. You are now subscribed to Mission Control telemetry updates, model patches, and firmware optimizations.`,
      html: `
        <div style="background-color: #0a0a0d; color: #ffffff; padding: 32px; font-family: 'Courier New', Courier, monospace; border: 1px solid #76b900; border-radius: 12px; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #76b900; letter-spacing: 2px; margin-top: 0;">[SYSTEM CONFIRMATION] TELEMETRY FEED SUBSCRIBED</h2>
          <p style="color: #cccccc; font-size: 14px; line-height: 1.6;">
            Operator <strong>${cleanEmail}</strong> has been enrolled in the zero-latency Mission Control update dispatch queue.
          </p>
          <div style="background-color: #12131a; border-left: 4px solid #76b900; padding: 16px; margin: 24px 0; border-radius: 4px;">
            <p style="margin: 0; color: #ffffff; font-weight: bold; font-size: 13px;">INCLUDED SUBSCRIPTION PIPELINES:</p>
            <ul style="color: #aaaaaa; font-size: 12px; margin: 8px 0 0 0; padding-left: 20px;">
              <li>AI Telemetry & Local Inference Model Updates</li>
              <li>GPU Driver Performance Patch Benchmarks</li>
              <li>Mission Control Desktop App Changelogs</li>
            </ul>
          </div>
          <footer style="margin-top: 32px; font-size: 10px; color: #666666; text-align: center; border-t: 1px solid #222; padding-top: 16px;">
            MISSION CONTROL ARCHITECTURE &bull; ZERO CLOUD DEPENDENCY
          </footer>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    let previewUrl = null;
    if (!host) {
      previewUrl = nodemailer.getTestMessageUrl(info);
      console.log("Newsletter Ethereal Preview URL:", previewUrl);
    }

    return NextResponse.json({
      success: true,
      message: "Subscribed to Mission Control Telemetry Feed successfully.",
      previewUrl,
      subscriberId: subscriberDoc?._id || null,
    });
  } catch (error: any) {
    console.error("Subscription endpoint error:", error);
    return NextResponse.json(
      { error: "Internal server error while processing subscription.", details: error.message },
      { status: 500 }
    );
  }
}
