import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ContactSubmission from "@/models/ContactSubmission";
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
    const { name, email, subject, message } = body;

    // Strict Validation
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Validation Error: 'name' is required." },
        { status: 400 }
      );
    }

    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        { error: "Validation Error: 'email' is required." },
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

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "Validation Error: 'message' is required." },
        { status: 400 }
      );
    }

    const cleanName = name.trim().slice(0, 100);
    const cleanSubject = subject ? String(subject).trim().slice(0, 150) : "General Support Inquiry";
    const cleanMessage = message.trim().slice(0, 5000);

    let submissionDoc = null;
    try {
      await connectDB();
      submissionDoc = await ContactSubmission.create({
        name: cleanName,
        email: cleanEmail,
        subject: cleanSubject,
        message: cleanMessage,
        emailSent: false,
      });
    } catch (dbErr: any) {
      console.warn("MongoDB ContactSubmission save warning (continuing email dispatch):", dbErr.message);
    }

    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const toEmail = process.env.CONTACT_EMAIL || "developers@missioncontrol.gg";

    let transporter;

    if (host && user && pass) {
      transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    } else {
      console.log("No SMTP credentials detected in environment. Initializing Ethereal Test Account...");
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

    const safeName = escapeHtml(cleanName);
    const safeEmail = escapeHtml(cleanEmail);
    const safeSubject = escapeHtml(cleanSubject);
    const safeMessage = escapeHtml(cleanMessage).replace(/\n/g, "<br>");

    const mailOptions = {
      from: `"${cleanName}" <${cleanEmail}>`,
      to: toEmail,
      subject: `[Mission Control Transmit] ${cleanSubject}`,
      text: `From: ${cleanName} (${cleanEmail})\nSubject: ${cleanSubject}\n\nMessage:\n${cleanMessage}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Incoming Support Transmission</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #050608; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #050608; padding: 30px 10px;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #0a0d14; border: 1px solid #76b90033; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,240,255,0.08);">
                  
                  <!-- Header Banner -->
                  <tr>
                    <td style="padding: 24px 30px; background: linear-gradient(135deg, #090d14 0%, #121824 100%); border-bottom: 1px solid #76b90033;">
                      <table width="100%" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td>
                            <span style="font-family: monospace; font-size: 11px; font-weight: 700; color: #76b900; letter-spacing: 2px; text-transform: uppercase;">[INCOMING TRANSMISSION]</span>
                            <h1 style="margin: 6px 0 0 0; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">MISSION CONTROL SUPPORT PORTAL</h1>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Content Area -->
                  <tr>
                    <td style="padding: 30px;">
                      
                      <!-- Sender Info Box -->
                      <table width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #101520; border: 1px solid #ffffff15; border-radius: 8px; margin-bottom: 20px;">
                        <tr>
                          <td style="padding: 16px;">
                            <p style="margin: 0 0 8px 0; font-size: 13px; color: #8899ac;"><strong>Sender Name:</strong> <span style="color: #ffffff; font-weight: 600;">${safeName}</span></p>
                            <p style="margin: 0 0 8px 0; font-size: 13px; color: #8899ac;"><strong>Sender Email:</strong> <a href="mailto:${safeEmail}" style="color: #76b900; text-decoration: none; font-weight: 600;">${safeEmail}</a></p>
                            <p style="margin: 0; font-size: 13px; color: #8899ac;"><strong>Subject:</strong> <span style="color: #00f0ff; font-weight: 600;">${safeSubject}</span></p>
                          </td>
                        </tr>
                      </table>

                      <!-- Message Body -->
                      <div style="font-size: 12px; font-family: monospace; color: #76b900; letter-spacing: 1px; margin-bottom: 8px; text-transform: uppercase;">TRANSMITTED MESSAGE DATA:</div>
                      <table width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #080a0f; border-left: 3px solid #76b900; border-radius: 4px;">
                        <tr>
                          <td style="padding: 20px; color: #d0d7de; font-size: 14px; line-height: 1.6; font-family: 'Segoe UI', Roboto, sans-serif;">
                            ${safeMessage}
                          </td>
                        </tr>
                      </table>

                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding: 20px 30px; background-color: #06080c; border-top: 1px solid #ffffff10; text-align: center;">
                      <p style="margin: 0; font-size: 11px; color: #556677; font-family: monospace;">
                        MISSION CONTROL INGESTION ENGINE &bull; AUTOMATED TELEMETRY DISPATCH
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

    if (submissionDoc) {
      await ContactSubmission.updateOne({ _id: submissionDoc._id }, { $set: { emailSent: true } }).catch(() => {});
    }

    if (!host) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log("-----------------------------------------");
      console.log("Contact Ethereal Email sent successfully!");
      console.log("Message ID:", info.messageId);
      console.log("Ethereal Preview URL:", previewUrl);
      console.log("-----------------------------------------");
      
      return NextResponse.json({
        success: true,
        message: "Message logged & processed via Ethereal fallback.",
        previewUrl,
        submissionId: submissionDoc?._id || null,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Email sent and logged successfully.",
      submissionId: submissionDoc?._id || null,
    });
  } catch (error: any) {
    console.error("Failed to send contact email:", error);
    return NextResponse.json(
      { error: "Internal Server Error. Failed to send message.", details: error.message },
      { status: 500 }
    );
  }
}
