import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    // Validation
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Required fields missing: name, email, and message are required." },
        { status: 400 }
      );
    }

    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const toEmail = process.env.CONTACT_EMAIL || "developers@missioncontrol.gg";

    let transporter;

    if (host && user && pass) {
      // Production SMTP Config
      transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    } else {
      // Local/Dev Fallback using Ethereal Email (Auto-generated Test Accounts)
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

    // Compose Email
    const mailOptions = {
      from: `"${name}" <${email}>`,
      to: toEmail,
      subject: subject ? `Mission Control Contact: ${subject}` : `Mission Control: Message from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
      html: `
        <div style="background-color: #0a0a0a; color: #ffffff; padding: 24px; font-family: sans-serif; border: 1px solid #1f1f1f; border-radius: 8px; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #00f0ff; border-b: 1px solid #1f1f1f; padding-bottom: 12px; margin-top: 0;">Incoming Transmission</h2>
          <p style="margin: 16px 0;"><strong>From:</strong> ${name} (&lt;${email}&gt;)</p>
          ${subject ? `<p style="margin: 16px 0;"><strong>Subject:</strong> ${subject}</p>` : ""}
          <div style="background-color: #111111; border: 1px solid #222222; padding: 16px; border-radius: 4px; color: #dddddd; line-height: 1.6; white-space: pre-wrap; margin-top: 24px;">
            ${message.replace(/\n/g, "<br>")}
          </div>
          <footer style="margin-top: 32px; font-size: 11px; color: #555555; text-align: center;">
            This email was sent from the Mission Control contact form portal.
          </footer>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);

    // If using Ethereal fallback, log the preview URL
    if (!host) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log("-----------------------------------------");
      console.log("Ethereal Email sent successfully!");
      console.log("Envelope:", info.envelope);
      console.log("Message ID:", info.messageId);
      console.log("Ethereal Preview URL:", previewUrl);
      console.log("-----------------------------------------");
      
      return NextResponse.json({
        success: true,
        message: "Message processed via Ethereal fallback.",
        previewUrl,
      });
    }

    return NextResponse.json({ success: true, message: "Email sent successfully." });
  } catch (error: any) {
    console.error("Failed to send email:", error);
    return NextResponse.json(
      { error: "Internal Server Error. Failed to send message.", details: error.message },
      { status: 500 }
    );
  }
}
