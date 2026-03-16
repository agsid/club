import { defineAction, ActionError } from 'astro:actions';
import { z } from 'astro:schema';
import { Resend } from 'resend';
import { JWT } from 'google-auth-library';

export const server = {
  joinClub: defineAction({
    accept: 'form',
    input: z.object({
      email: z.string().email(),
      clubName: z.string(),
    }),
    handler: async (input) => {
      // Initialize Resend inside the handler
      const resend = new Resend(import.meta.env.RESEND_API_KEY);

      try {
        // 1. Setup Google Auth
        let rawKey = import.meta.env.GOOGLE_PRIVATE_KEY;
        if (rawKey.startsWith('"')) rawKey = rawKey.slice(1, -1);
        const formattedKey = rawKey.replace(/\\n/g, '\n');

        const auth = new JWT({
          email: import.meta.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          key: formattedKey,
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        // 2. Log to Google Sheets
        const spreadsheetId = import.meta.env.GOOGLE_SHEET_ID;
        await auth.request({
          url: `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A:D:append?valueInputOption=USER_ENTERED`,
          method: 'POST',
          data: {
            values: [[input.email, input.clubName, 'Interested', new Date().toLocaleString()]]
          }
        });

        // 3. Send the Email
        const { data, error } = await resend.emails.send({
          from: 'Clubs <sid@alliedalgos.org>',
          to: [input.email],
          subject: `Welcome to ${input.clubName}`,
          html: `<p>Thanks for joining <strong>${input.clubName}</strong>! We will send payment details shortly.</p>`,
        });

        if (error) throw new Error(error.message);

        return { success: true, message: "Email sent and logged!" };

      } catch (e: any) {
        console.error("DEBUG ERROR:", e);
        throw new ActionError({
          code: 'INTERNAL_SERVER_ERROR',
          message: e.message || "Something went wrong",
        });
      }
    }
  })
};