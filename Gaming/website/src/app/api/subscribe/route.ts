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
    let recentBlogs: any[] = [];

    try {
      await connectDB();
      subscriberDoc = await Subscriber.findOneAndUpdate(
        { email: cleanEmail },
        { email: cleanEmail, status: "active", source: "footer_newsletter", subscribedAt: new Date() },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
      );

      // Fetch the latest 2 published blog dispatches to include in the email
      recentBlogs = await GamingPost.find({})
        .sort({ publishedAt: -1 })
        .limit(2)
        .select("title slug category excerpt coverImage publishedAt")
        .lean();
    } catch (dbError: any) {
      console.warn("MongoDB subscription/blog fetch notice:", dbError.message);
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
    const baseUrl = "https://mission-control-roan-seven.vercel.app";

    // Category colors
    const categoryColors: Record<string, { color: string; bg: string }> = {
      "Game News": { color: "#76b900", bg: "rgba(118, 185, 0, 0.15)" },
      "GPU News": { color: "#c084fc", bg: "rgba(192, 132, 252, 0.15)" },
      "Hardware Deep-Dive": { color: "#38bdf8", bg: "rgba(56, 189, 248, 0.15)" },
      "Game Revisit": { color: "#fbbf24", bg: "rgba(251, 191, 36, 0.15)" },
    };

    // Render blogs section
    let blogsHtml = "";
    if (recentBlogs && recentBlogs.length > 0) {
      const cards = recentBlogs.map((post: any) => {
        const catCfg = categoryColors[post.category] || { color: "#76b900", bg: "rgba(118, 185, 0, 0.15)" };
        
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
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 20px; background-color: #0b101b; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; overflow: hidden;">
            ${coverImgUrl ? `
            <tr>
              <td style="padding: 0; line-height: 0;">
                <a href="${postLink}" target="_blank" style="display: block; text-decoration: none;">
                  <img src="${coverImgUrl}" alt="${safeTitle}" width="100%" style="width: 100%; max-height: 190px; object-fit: cover; display: block; border-bottom: 1px solid rgba(255,255,255,0.08);" />
                </a>
              </td>
            </tr>
            ` : ""}
            <tr>
              <td style="padding: 16px 20px;">
                <span style="display: inline-block; padding: 3px 8px; border-radius: 4px; font-family: monospace; font-size: 10px; font-weight: 700; color: ${catCfg.color}; background-color: ${catCfg.bg}; text-transform: uppercase; margin-bottom: 8px;">
                  ${escapeHtml(post.category || "INTEL")}
                </span>
                <h3 style="margin: 4px 0 8px 0; font-size: 15px; font-weight: 700; color: #ffffff; line-height: 1.4;">
                  <a href="${postLink}" target="_blank" style="color: #ffffff; text-decoration: none;">
                    ${safeTitle}
                  </a>
                </h3>
                <p style="margin: 0 0 14px 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
                  ${safeExcerpt}
                </p>
                <a href="${postLink}" target="_blank" style="display: inline-block; background-color: rgba(118, 185, 0, 0.15); color: #76b900; border: 1px solid rgba(118, 185, 0, 0.4); padding: 6px 14px; border-radius: 6px; font-weight: 700; font-size: 11px; text-decoration: none; font-family: monospace; text-transform: uppercase;">
                  Read Article &rarr;
                </a>
              </td>
            </tr>
          </table>
        `;
      }).join("");

      blogsHtml = `
        <div style="margin-top: 24px;">
          <p style="margin: 0 0 12px 0; font-family: monospace; font-size: 11px; font-weight: 700; color: #76b900; letter-spacing: 1.5px; text-transform: uppercase;">
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
        <body style="margin: 0; padding: 0; background-color: #050608; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #050608; padding: 25px 10px;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #090c12; border: 1px solid rgba(118,185,0,0.3); border-radius: 14px; overflow: hidden; box-shadow: 0 12px 35px rgba(0,0,0,0.7);">
                  
                  <!-- Banner Header -->
                  <tr>
                    <td style="padding: 24px 30px; background: linear-gradient(135deg, #090f17 0%, #0d1522 100%); border-bottom: 1px solid rgba(118,185,0,0.25);">
                      <table width="100%" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td>
                            <span style="font-family: monospace; font-size: 11px; font-weight: 700; color: #76b900; letter-spacing: 2px; text-transform: uppercase;">[SYSTEM CONFIRMATION]</span>
                            <h1 style="margin: 6px 0 0 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                              MISSION <span style="color: #76b900;">CONTROL</span> TELEMETRY
                            </h1>
                          </td>
                          <td align="right" style="vertical-align: middle;">
                            <span style="display: inline-block; padding: 4px 10px; background-color: rgba(118,185,0,0.15); border: 1px solid rgba(118,185,0,0.4); border-radius: 20px; font-family: monospace; font-size: 10px; font-weight: 700; color: #76b900;">
                              1X / WEEK
                            </span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Main Content -->
                  <tr>
                    <td style="padding: 28px 30px;">
                      <p style="margin: 0 0 18px 0; color: #c0cddc; font-size: 14px; line-height: 1.6;">
                        Operator <strong style="color: #76b900; font-family: monospace;">${safeEmail}</strong> has been enrolled in the Mission Control telemetry dispatch queue. You will receive <strong>one weekly digest</strong> containing top gaming intel, firmware updates, and GPU benchmark analyses.
                      </p>

                      <!-- Schedule Card -->
                      <table width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0e1420; border-left: 3px solid #76b900; border-radius: 6px; margin-bottom: 24px;">
                        <tr>
                          <td style="padding: 16px 20px;">
                            <p style="margin: 0 0 8px 0; color: #ffffff; font-weight: 700; font-size: 11px; font-family: monospace; letter-spacing: 1px;">WEEKLY DISPATCH SCHEDULE:</p>
                            <ul style="color: #94a3b8; font-size: 12px; margin: 0; padding-left: 18px; line-height: 1.7;">
                              <li>⚡ <strong>GPU News</strong>: Architecture breakdowns & Tensor core benchmarks</li>
                              <li>🎮 <strong>Game News</strong>: Performance launches & DLSS frame gen updates</li>
                              <li>🔧 <strong>Hardware Deep-Dives</strong>: Silicon thermals & driver optimizers</li>
                            </ul>
                          </td>
                        </tr>
                      </table>

                      <!-- Featured Blogs -->
                      ${blogsHtml}

                      <!-- Portal Link -->
                      <div style="text-align: center; margin: 24px 0 10px 0;">
                        <a href="${baseUrl}/blog" target="_blank" style="display: inline-block; background-color: #76b900; color: #000000; padding: 10px 24px; border-radius: 8px; font-weight: 800; font-size: 12px; text-decoration: none; font-family: monospace; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 4px 15px rgba(118,185,0,0.3);">
                          Browse Full Blog Intelligence &rarr;
                        </a>
                      </div>

                    </td>
                  </tr>

                  <!-- Social & Community Links Section -->
                  <tr>
                    <td style="padding: 20px 30px; background-color: #07090e; border-top: 1px solid rgba(255,255,255,0.06); text-align: center;">
                      <p style="margin: 0 0 12px 0; font-family: monospace; font-size: 11px; font-weight: 700; color: #94a3b8; letter-spacing: 1px; text-transform: uppercase;">
                        CONNECT & CONTRIBUTE:
                      </p>
                      <table role="presentation" align="center" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td style="padding: 0 10px;">
                            <a href="https://github.com/arnab825/Mission-Control" target="_blank" style="color: #76b900; text-decoration: none; font-family: monospace; font-size: 12px; font-weight: 700;">
                              🐙 GitHub
                            </a>
                          </td>
                          <td style="color: rgba(255,255,255,0.2); font-size: 12px;">&bull;</td>
                          <td style="padding: 0 10px;">
                            <a href="https://discord.com" target="_blank" style="color: #76b900; text-decoration: none; font-family: monospace; font-size: 12px; font-weight: 700;">
                              💬 Discord
                            </a>
                          </td>
                          <td style="color: rgba(255,255,255,0.2); font-size: 12px;">&bull;</td>
                          <td style="padding: 0 10px;">
                            <a href="https://twitter.com" target="_blank" style="color: #76b900; text-decoration: none; font-family: monospace; font-size: 12px; font-weight: 700;">
                              🐦 Twitter / X
                            </a>
                          </td>
                          <td style="color: rgba(255,255,255,0.2); font-size: 12px;">&bull;</td>
                          <td style="padding: 0 10px;">
                            <a href="${baseUrl}/docs" target="_blank" style="color: #76b900; text-decoration: none; font-family: monospace; font-size: 12px; font-weight: 700;">
                              📖 Docs
                            </a>
                          </td>
                          <td style="color: rgba(255,255,255,0.2); font-size: 12px;">&bull;</td>
                          <td style="padding: 0 10px;">
                            <a href="${baseUrl}/games-tested" target="_blank" style="color: #76b900; text-decoration: none; font-family: monospace; font-size: 12px; font-weight: 700;">
                              🎮 Benchmarks
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding: 18px 30px; background-color: #040508; border-top: 1px solid rgba(255,255,255,0.04); text-align: center;">
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
      message: "Subscribed to Mission Control Telemetry Feed successfully. Dispatches delivered once weekly.",
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

// DELETE: Unsubscribe from weekly telemetry newsletter
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Validation Error: Please provide a valid email address." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    try {
      await connectDB();
      await Subscriber.findOneAndUpdate(
        { email: cleanEmail },
        { status: "unsubscribed", unsubscribedAt: new Date() }
      );
    } catch (dbError: any) {
      console.warn("MongoDB unsubscribe notice:", dbError.message);
    }

    return NextResponse.json({
      success: true,
      message: `Unsubscribed ${cleanEmail} from weekly telemetry feed.`
    });
  } catch (error: any) {
    console.error("Unsubscribe endpoint error:", error);
    return NextResponse.json(
      { error: "Internal server error while unsubscribing.", details: error.message },
      { status: 500 }
    );
  }
}
