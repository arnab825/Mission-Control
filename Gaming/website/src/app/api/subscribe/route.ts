import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Subscriber from "@/models/Subscriber";
import nodemailer from "nodemailer";
import { BASE_SITE_URL } from "@/lib/siteUrl";
import {
  SubscribeSchema,
  validateRequestBody,
  handleApiError,
  checkAccountRateLimit,
} from "@/lib/api-validation";

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
    const rawBody = await request.json();
    const validation = validateRequestBody(SubscribeSchema, rawBody);
    if (!validation.success) {
      return validation.response;
    }

    const { email } = validation.data;
    const cleanEmail = email.toLowerCase();

    // Enforce per-account exponential backoff rate limiting
    const accountCheck = checkAccountRateLimit(`sub:${cleanEmail}`);
    if (!accountCheck.allowed && accountCheck.response) {
      return accountCheck.response;
    }

    let isNewSubscriber = false;

    try {
      await connectDB();

      // Check if already subscribed
      const existing = await Subscriber.findOne({ email: cleanEmail });
      if (!existing) {
        await Subscriber.create({ email: cleanEmail, isActive: true });
        isNewSubscriber = true;
      } else if (!existing.isActive) {
        existing.isActive = true;
        await existing.save();
        isNewSubscriber = true;
      }
    } catch (dbErr: any) {
      console.warn("MongoDB Subscriber connection notice:", dbErr.message);
    }

    // Initialize Mailer
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
    const baseUrl = BASE_SITE_URL;

    const mailOptions = {
      from: `"Mission Control Telemetry" <noreply@missioncontrol.gg>`,
      to: cleanEmail,
      subject: "⚡ [Telemetry Activated] Welcome to Mission Control Weekly Dispatch",
      text: `Operator registered: ${cleanEmail}. You are now subscribed to Mission Control weekly telemetry updates, architecture guides, and driver patch notes.\n\nExplore our docs at ${baseUrl}/docs`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Telemetry Feed Subscribed</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #040507; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #040507; padding: 30px 10px;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 620px; background-color: #090c13; border: 1px solid rgba(118,185,0,0.3); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.85);">
                  
                  <!-- Top Glowing Cyber Accent Laser Line -->
                  <tr>
                    <td style="height: 3px; background: linear-gradient(90deg, transparent 0%, #76b900 30%, #bfff00 50%, #76b900 70%, transparent 100%);"></td>
                  </tr>

                  <!-- Banner Header -->
                  <tr>
                    <td style="padding: 26px 32px; background: linear-gradient(180deg, #0d131d 0%, #090d14 100%); border-bottom: 1px solid rgba(255,255,255,0.08);">
                      <table width="100%" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td>
                            <div style="font-family: monospace; font-size: 10px; font-weight: 700; color: #76b900; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 4px;">
                              SYSTEM TELEMETRY DISPATCH
                            </div>
                            <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                              MISSION <span style="color: #76b900; text-shadow: 0 0 15px rgba(118,185,0,0.5);">CONTROL</span>
                            </h1>
                          </td>
                          <td align="right" style="vertical-align: middle;">
                            <span style="display: inline-block; padding: 5px 12px; background-color: rgba(118,185,0,0.12); border: 1px solid rgba(118,185,0,0.4); border-radius: 20px; font-family: monospace; font-size: 10px; font-weight: 700; color: #76b900; letter-spacing: 0.5px;">
                              &bull; 1X / WEEK DISPATCH
                            </span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Main Content -->
                  <tr>
                    <td style="padding: 30px 32px;">
                      
                      <!-- Status Banner Card -->
                      <table width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0e1422; border: 1px solid rgba(255,255,255,0.08); border-left: 4px solid #76b900; border-radius: 10px; margin-bottom: 24px; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
                        <tr>
                          <td style="padding: 16px 20px;">
                            <div style="font-family: monospace; font-size: 11px; font-weight: 700; color: #76b900; text-transform: uppercase; margin-bottom: 4px;">
                              OPERATOR ENROLLED
                            </div>
                            <p style="margin: 0; color: #cbd5e1; font-size: 13px; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                              Terminal key <strong style="color: #ffffff; font-family: monospace;">${safeEmail}</strong> is now authenticated. You will receive weekly technical summaries, GPU architecture updates, and system telemetry patches.
                            </p>
                          </td>
                        </tr>
                      </table>

                      <!-- Schedule Card -->
                      <table width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0b0f19; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; margin-bottom: 24px;">
                        <tr>
                          <td style="padding: 18px 20px;">
                            <p style="margin: 0 0 12px 0; color: #ffffff; font-weight: 700; font-size: 11px; font-family: monospace; letter-spacing: 1.5px; text-transform: uppercase;">
                              WEEKLY DISPATCH CONTENT:
                            </p>
                            <table width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size: 12px; color: #94a3b8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                              <tr>
                                <td style="padding: 6px 0; width: 140px; vertical-align: middle;">
                                  <span style="display: inline-block; padding: 3px 8px; border-radius: 5px; font-family: monospace; font-size: 10px; font-weight: 700; color: #c084fc; background-color: rgba(192, 132, 252, 0.12); border: 1px solid rgba(192, 132, 252, 0.35); text-transform: uppercase;">
                                    GPU ARCHITECTURE
                                  </span>
                                </td>
                                <td style="padding: 6px 0; vertical-align: middle; line-height: 1.4; color: #cbd5e1;">
                                  TensorRT optimizations, driver changelogs &amp; low-overhead hooks
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 6px 0; width: 140px; vertical-align: middle;">
                                  <span style="display: inline-block; padding: 3px 8px; border-radius: 5px; font-family: monospace; font-size: 10px; font-weight: 700; color: #76b900; background-color: rgba(118, 185, 0, 0.12); border: 1px solid rgba(118, 185, 0, 0.35); text-transform: uppercase;">
                                    SYSTEM TELEMETRY
                                  </span>
                                </td>
                                <td style="padding: 6px 0; vertical-align: middle; line-height: 1.4; color: #cbd5e1;">
                                  In-game HUD overlay pacing, DirectX presentations &amp; frame-time graphs
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 6px 0; width: 140px; vertical-align: middle;">
                                  <span style="display: inline-block; padding: 3px 8px; border-radius: 5px; font-family: monospace; font-size: 10px; font-weight: 700; color: #38bdf8; background-color: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.35); text-transform: uppercase;">
                                    DISTRIBUTED NODE
                                  </span>
                                </td>
                                <td style="padding: 6px 0; vertical-align: middle; line-height: 1.4; color: #cbd5e1;">
                                  Distributed cluster health, cloud synchronizations &amp; cross-node library indexing
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      <!-- Portal Primary CTA Button -->
                      <div style="text-align: center; margin: 30px 0 10px 0;">
                        <a href="${baseUrl}/docs" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #76b900 0%, #5d9300 100%); color: #07090e; padding: 12px 28px; border-radius: 10px; font-weight: 900; font-size: 12px; text-decoration: none; font-family: monospace; text-transform: uppercase; letter-spacing: 0.8px; box-shadow: 0 4px 20px rgba(118,185,0,0.35);">
                          Explore Documentation &amp; Roadmap &rarr;
                        </a>
                      </div>

                    </td>
                  </tr>

                  <!-- Social & Community Links Section -->
                  <tr>
                    <td style="padding: 22px 30px; background-color: #06080e; border-top: 1px solid rgba(255,255,255,0.06); text-align: center;">
                      <p style="margin: 0 0 14px 0; font-family: monospace; font-size: 10px; font-weight: 700; color: #64748b; letter-spacing: 1.5px; text-transform: uppercase;">
                        CONNECT &bull; CONTRIBUTE &bull; EXPLORE
                      </p>
                      <table role="presentation" align="center" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td style="padding: 0 8px;">
                            <a href="https://github.com/arnab825/Mission-Control" target="_blank" style="color: #76b900; text-decoration: none; font-family: monospace; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center;">
                              <img src="https://cdn.simpleicons.org/github/76b900" width="13" height="13" alt="GitHub" style="vertical-align: -2px; margin-right: 5px; display: inline-block;" /> GitHub
                            </a>
                          </td>
                          <td style="color: rgba(255,255,255,0.15); font-size: 12px;">&bull;</td>
                          <td style="padding: 0 8px;">
                            <a href="https://discord.com" target="_blank" style="color: #76b900; text-decoration: none; font-family: monospace; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center;">
                              <img src="https://cdn.simpleicons.org/discord/76b900" width="14" height="14" alt="Discord" style="vertical-align: -2px; margin-right: 5px; display: inline-block;" /> Discord
                            </a>
                          </td>
                          <td style="color: rgba(255,255,255,0.15); font-size: 12px;">&bull;</td>
                          <td style="padding: 0 8px;">
                            <a href="https://twitter.com" target="_blank" style="color: #76b900; text-decoration: none; font-family: monospace; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center;">
                              <img src="https://cdn.simpleicons.org/x/76b900" width="12" height="12" alt="X" style="vertical-align: -2px; margin-right: 5px; display: inline-block;" /> Twitter / X
                            </a>
                          </td>
                          <td style="color: rgba(255,255,255,0.15); font-size: 12px;">&bull;</td>
                          <td style="padding: 0 8px;">
                            <a href="${baseUrl}/docs" target="_blank" style="color: #76b900; text-decoration: none; font-family: monospace; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center;">
                              <img src="https://api.iconify.design/lucide:book-open.svg?color=%2376b900" width="13" height="13" alt="Docs" style="vertical-align: -2px; margin-right: 5px; display: inline-block;" /> Docs
                            </a>
                          </td>
                          <td style="color: rgba(255,255,255,0.15); font-size: 12px;">&bull;</td>
                          <td style="padding: 0 8px;">
                            <a href="${baseUrl}/games-tested" target="_blank" style="color: #76b900; text-decoration: none; font-family: monospace; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center;">
                              <img src="https://api.iconify.design/lucide:gamepad-2.svg?color=%2376b900" width="13" height="13" alt="Benchmarks" style="vertical-align: -2px; margin-right: 5px; display: inline-block;" /> Benchmarks
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding: 18px 30px; background-color: #030406; border-top: 1px solid rgba(255,255,255,0.04); text-align: center;">
                      <p style="margin: 0 0 6px 0; font-size: 10px; color: #475569; font-family: monospace;">
                        MISSION CONTROL ARCHITECTURE &bull; ZERO CLOUD DEPENDENCY
                      </p>
                      <p style="margin: 0; font-size: 10px; color: #475569; font-family: monospace;">
                        You received this because ${safeEmail} subscribed to weekly updates. To manage or unsubscribe, visit <a href="${baseUrl}/contact" target="_blank" style="color: #76b900; text-decoration: underline;">Contact & Preferences</a>.
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
      message: isNewSubscriber
        ? "Successfully enrolled into weekly telemetry feed."
        : "Email already active in weekly telemetry feed.",
      previewUrl,
    });
  } catch (error: unknown) {
    return handleApiError(
      "POST /api/subscribe",
      error,
      500,
      "Failed to process subscription request. Please try again later."
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Validation Error: Email parameter is required to unsubscribe." },
        { status: 400 }
      );
    }

    const validation = SubscribeSchema.safeParse({ email });
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation Error: Please provide a valid email format." },
        { status: 400 }
      );
    }

    const cleanEmail = validation.data.email.toLowerCase();
    await connectDB();

    const sub = await Subscriber.findOne({ email: cleanEmail });
    if (sub) {
      sub.isActive = false;
      await sub.save();
    }

    return NextResponse.json({
      success: true,
      message: `Successfully unsubscribed ${cleanEmail} from weekly telemetry feed.`,
    });
  } catch (error: unknown) {
    return handleApiError(
      "DELETE /api/subscribe",
      error,
      500,
      "Failed to process unsubscribe request. Please try again later."
    );
  }
}
