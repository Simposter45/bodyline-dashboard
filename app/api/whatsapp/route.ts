// ============================================================
// app/api/whatsapp/route.ts
// Secure server-side handler for sending WhatsApp reminders
// via the Meta WhatsApp Cloud API (FEAT-012a).
// API credentials are never exposed to the browser.
// ============================================================

import { NextRequest, NextResponse } from "next/server";

export interface SendReminderPayload {
  phone: string;
  memberName: string;
  gymName: string;
  amountDue: number;
}

/**
 * Strips any leading country code (+91 / 91) and non-numeric chars
 * from an Indian phone number, returning the raw 10-digit number.
 */
function sanitizePhone(raw: string): string {
  const digitsOnly = raw.replace(/\D/g, "");
  if (digitsOnly.startsWith("91") && digitsOnly.length === 12) {
    return digitsOnly.slice(2);
  }
  return digitsOnly;
}

export async function POST(req: NextRequest) {
  // 1. Parse and validate the request body
  let body: SendReminderPayload;
  try {
    body = (await req.json()) as SendReminderPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { phone, memberName, gymName, amountDue } = body;

  if (!phone || !memberName || !gymName || amountDue == null) {
    return NextResponse.json(
      { error: "Missing required fields: phone, memberName, gymName, amountDue." },
      { status: 400 }
    );
  }

  // 2. Read server-side credentials (never exposed to the client)
  const token = process.env.META_WHATSAPP_TOKEN;
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.error("[WhatsApp] Missing META_WHATSAPP_TOKEN or META_PHONE_NUMBER_ID in env.");
    return NextResponse.json(
      { error: "WhatsApp integration is not configured on the server." },
      { status: 500 }
    );
  }

  // 3. Build the Meta Graph API payload
  const sanitizedPhone = sanitizePhone(phone);
  const metaPayload = {
    messaging_product: "whatsapp",
    to: `91${sanitizedPhone}`, // Meta requires full E.164 format without the +
    type: "template",
    template: {
      name: "payment_reminder",
      language: { code: "en_US" },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: memberName },
            { type: "text", text: gymName },
            { type: "text", text: String(amountDue) },
          ],
        },
      ],
    },
  };

  // 4. Call the Meta Cloud API
  let metaResponse: Response;
  try {
    metaResponse = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(metaPayload),
      }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Network error reaching Meta API.";
    console.error("[WhatsApp] Fetch error:", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  // 5. Handle the Meta API response
  if (!metaResponse.ok) {
    const errorBody = await metaResponse.json().catch(() => ({})) as Record<string, unknown>;
    const metaMessage =
      typeof errorBody?.error === "object" && errorBody.error !== null
        ? (errorBody.error as Record<string, unknown>)?.message
        : errorBody?.error;
    const displayMessage =
      typeof metaMessage === "string"
        ? metaMessage
        : "Meta API rejected the request. Check server logs for details.";
    console.error("[WhatsApp] Meta API error:", JSON.stringify(errorBody, null, 2));
    return NextResponse.json(
      { error: displayMessage },
      { status: metaResponse.status }
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
