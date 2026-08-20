import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Subscriber from "@/models/Subscriber";
import GamingPost from "@/models/GamingPost";
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

    // Strict Email Validation
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Validation Error: Email address is required." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json(
        { error: "Validation Error: Please provide a valid email format." },
        { status: 400 }
      );
    }

    let isNewSubscriber = false;
    let recentBlogs: any[] = [];

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

      // Fetch 2 latest gaming blogs to include in welcome/confirm email
      recentBlogs = await GamingPost.find({ publishedAt: { $lte: new Date() } })
        .sort({ publishedAt: -1 })
        .limit(2)
        .lean();
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
    const baseUrl = "https://mission-control-roan-seven.vercel.app";

    // Category colors
    const categoryColors: Record<string, { color: string; bg: string; border: string }> = {
      "Game News": { color: "#76b900", bg: "rgba(118, 185, 0, 0.12)", border: "rgba(118, 185, 0, 0.3)" },
      "GPU News": { color: "#c084fc", bg: "rgba(192, 132, 252, 0.12)", border: "rgba(192, 132, 252, 0.3)" },
      "Hardware Deep-Dive": { color: "#38bdf8", bg: "rgba(56, 189, 248, 0.12)", border: "rgba(56, 189, 248, 0.3)" },
      "Game Revisit": { color: "#fbbf24", bg: "rgba(251, 191, 36, 0.12)", border: "rgba(251, 191, 36, 0.3)" },
    };

    // Render blogs section
    let blogsHtml = "";
    if (recentBlogs && recentBlogs.length > 0) {
      const cards = recentBlogs.map((post: any) => {
        const catCfg = categoryColors[post.category] || { color: "#76b900", bg: "rgba(118, 185, 0, 0.12)", border: "rgba(118, 185, 0, 0.3)" };
        
        let coverImgUrl = post.coverImage || "";
        if (coverImgUrl.startsWith("/")) {
          coverImgUrl = `${baseUrl}${coverImgUrl}`;
        } else if (!coverImgUrl || coverImgUrl.includes("placeholder")) {
          coverImgUrl = `${baseUrl}/api/blob?pathname=images%2Fblog%2F${encodeURIComponent(post.slug)}.png`;
        }

        const safeTitle = escapeHtml(post.title || "Gaming Intel Dispatch");
        const safeExcerpt = escapeHtml(
          post.excerpt ? (post.excerpt.length > 130 ? `${post.excerpt.substring(0, 130)}...` : post.excerpt) : "Read our in-depth technical analysis and benchmarks."
        );
        const postLink = `${baseUrl}/blog/gaming/${encodeURIComponent(post.slug)}`;

        return `
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 18px; background-color: #0c0f17; border: 1px solid rgba(255,255,255,0.09); border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.4);">
            ${coverImgUrl ? `
            <tr>
              <td style="padding: 0; line-height: 0;">
                <a href="${postLink}" target="_blank" style="display: block; text-decoration: none;">
                  <img src="${coverImgUrl}" alt="${safeTitle}" width="100%" style="width: 100%; max-height: 200px; object-fit: cover; display: block; border-bottom: 1px solid rgba(255,255,255,0.08);" />
                </a>
              </td>
            </tr>
            ` : ""}
            <tr>
              <td style="padding: 18px 22px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td>
                      <span style="display: inline-block; padding: 3px 10px; border-radius: 6px; font-family: monospace; font-size: 10px; font-weight: 700; color: ${catCfg.color}; background-color: ${catCfg.bg}; border: 1px solid ${catCfg.border}; text-transform: uppercase; margin-bottom: 10px;">
                        ${escapeHtml(post.category || "INTEL")}
                      </span>
                      <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 700; color: #ffffff; line-height: 1.4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                        <a href="${postLink}" target="_blank" style="color: #ffffff; text-decoration: none;">
                          ${safeTitle}
                        </a>
                      </h3>
                      <p style="margin: 0 0 16px 0; font-size: 12px; color: #94a3b8; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                        ${safeExcerpt}
                      </p>
                      <a href="${postLink}" target="_blank" style="display: inline-block; background-color: rgba(118, 185, 0, 0.12); color: #76b900; border: 1px solid rgba(118, 185, 0, 0.35); padding: 7px 16px; border-radius: 8px; font-weight: 700; font-size: 11px; text-decoration: none; font-family: monospace; text-transform: uppercase; letter-spacing: 0.5px;">
                        Read Intel Dispatch &rarr;
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        `;
      }).join("");

      blogsHtml = `
        <div style="margin-top: 26px;">
          <p style="margin: 0 0 14px 0; font-family: monospace; font-size: 11px; font-weight: 700; color: #76b900; letter-spacing: 1.5px; text-transform: uppercase; display: flex; align-items: center;">
            FEATURED GAMING INTEL DISPATCHES:
          </p>
          ${cards}
        </div>
      `;
    }

    const mailOptions = {
      from: `"Mission Control Telemetry" <noreply@missioncontrol.gg>`,
      to: cleanEmail,
      subject: "⚡ [Telemetry Activated] Welcome to Mission Control Weekly Intel Feed",
      text: `Operator registered: ${cleanEmail}. You are now subscribed to Mission Control weekly telemetry updates, model patches, and gaming intel blogs.\n\nExplore our latest articles at ${baseUrl}/blog`,
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
                              Terminal key <strong style="color: #ffffff; font-family: monospace;">${safeEmail}</strong> is now authenticated. You will receive weekly technical summaries, GPU architecture deep-dives, and AI-assisted game telemetry patches.
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
                                <td style="padding: 6px 0; width: 115px; vertical-align: middle;">
                                  <span style="display: inline-block; padding: 3px 8px; border-radius: 5px; font-family: monospace; font-size: 10px; font-weight: 700; color: #c084fc; background-color: rgba(192, 132, 252, 0.12); border: 1px solid rgba(192, 132, 252, 0.35); text-transform: uppercase;">
                                    GPU NEWS
                                  </span>
                                </td>
                                <td style="padding: 6px 0; vertical-align: middle; line-height: 1.4; color: #cbd5e1;">
                                  Architecture breakdowns, driver changelogs & Tensor metrics
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 6px 0; width: 115px; vertical-align: middle;">
                                  <span style="display: inline-block; padding: 3px 8px; border-radius: 5px; font-family: monospace; font-size: 10px; font-weight: 700; color: #76b900; background-color: rgba(118, 185, 0, 0.12); border: 1px solid rgba(118, 185, 0, 0.35); text-transform: uppercase;">
                                    GAME NEWS
                                  </span>
                                </td>
                                <td style="padding: 6px 0; vertical-align: middle; line-height: 1.4; color: #cbd5e1;">
                                  Launch performance analysis, DLSS 3.7 vs FSR frame pacing
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 6px 0; width: 115px; vertical-align: middle;">
                                  <span style="display: inline-block; padding: 3px 8px; border-radius: 5px; font-family: monospace; font-size: 10px; font-weight: 700; color: #38bdf8; background-color: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.35); text-transform: uppercase;">
                                    HARDWARE
                                  </span>
                                </td>
                                <td style="padding: 6px 0; vertical-align: middle; line-height: 1.4; color: #cbd5e1;">
                                  Silicon thermals, undervolt telemetry & engine deep-dives
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      <!-- Featured Blogs -->
                      ${blogsHtml}

                      <!-- Portal Primary CTA Button -->
                      <div style="text-align: center; margin: 30px 0 10px 0;">
                        <a href="${baseUrl}/blog" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #76b900 0%, #5d9300 100%); color: #07090e; padding: 12px 28px; border-radius: 10px; font-weight: 900; font-size: 12px; text-decoration: none; font-family: monospace; text-transform: uppercase; letter-spacing: 0.8px; box-shadow: 0 4px 20px rgba(118,185,0,0.35);">
                          Browse Full Blog Intelligence &rarr;
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
  } catch (error: any) {
    console.error("Subscription API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process subscription request." },
      { status: 500 }
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

    const cleanEmail = email.trim().toLowerCase();
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
  } catch (error: any) {
    console.error("Unsubscribe API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process unsubscribe request." },
      { status: 500 }
    );
  }
}
