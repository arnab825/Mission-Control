import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Subscriber from "@/models/Subscriber";
import nodemailer from "nodemailer";

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        { error: "Validation Error: Please provide an email address." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json(
        { error: "Validation Error: Please provide a valid email address." },
        { status: 400 }
      );
    }

    let subscriberDoc = null;
    try {
      await connectDB();
      subscriberDoc = await Subscriber.findOneAndUpdate(
        { email: cleanEmail },
        { email: cleanEmail, status: "active", source: "footer_newsletter", subscribedAt: new Date() },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
      );
    } catch (dbError: any) {
      console.warn("MongoDB subscription save failed (operating in fallback mode):", dbError.message);
    }

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

    const safeEmail = escapeHtml(cleanEmail);

    const mailOptions = {
      from: `"Mission Control Telemetry" <noreply@missioncontrol.gg>`,
      to: cleanEmail,
      subject: "[System Activated] Mission Control Telemetry Feed Subscribed",
      text: `Operator registered: ${cleanEmail}. You are now subscribed to Mission Control telemetry updates, model patches, and firmware optimizations.`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Telemetry Feed Subscribed</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #050608; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #050608; padding: 30px 10px;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #090c12; border: 1px solid #76b90044; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(118,185,0,0.1);">
                  
                  <!-- Banner -->
                  <tr>
                    <td style="padding: 24px 30px; background: linear-gradient(135deg, #090f17 0%, #111a28 100%); border-bottom: 1px solid #76b90033;">
                      <span style="font-family: monospace; font-size: 11px; font-weight: 700; color: #76b900; letter-spacing: 2px; text-transform: uppercase;">[SYSTEM CONFIRMATION]</span>
                      <h1 style="margin: 6px 0 0 0; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">TELEMETRY FEED ACTIVATED</h1>
                    </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td style="padding: 30px;">
                      <p style="margin: 0 0 20px 0; color: #c0cddc; font-size: 14px; line-height: 1.6;">
                        Operator <strong style="color: #76b900;">${safeEmail}</strong> has been enrolled in the Mission Control zero-latency dispatch queue.
                      </p>

                      <table width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0e1420; border-left: 3px solid #76b900; border-radius: 4px;">
                        <tr>
                          <td style="padding: 18px;">
                            <p style="margin: 0 0 10px 0; color: #ffffff; font-weight: 700; font-size: 12px; font-family: monospace; letter-spacing: 1px;">ACTIVE SUBSCRIPTION DISPATCHES:</p>
                            <ul style="color: #99aabc; font-size: 13px; margin: 0; padding-left: 20px; line-height: 1.8;">
                              <li>AI Telemetry & Local Inference Model Updates</li>
                              <li>GPU Driver Performance Patch Benchmarks</li>
                              <li>Mission Control Desktop App Changelogs</li>
                            </ul>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding: 20px 30px; background-color: #06080c; border-top: 1px solid #ffffff10; text-align: center;">
                      <p style="margin: 0; font-size: 11px; color: #556677; font-family: monospace;">
                        MISSION CONTROL ARCHITECTURE &bull; ZERO CLOUD DEPENDENCY
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
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
