import { defineAction, ActionError } from 'astro:actions';
import { z } from 'astro:schema';
import { Resend } from 'resend';
import Stripe from 'stripe';
import { JWT } from 'google-auth-library';

// Initialize with environment variables
const resend = new Resend(import.meta.env.RESEND_API_KEY);
const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY);

export const server = {
  getCheckoutSession: defineAction({
    accept: 'form',
    input: z.object({
      email: z.string().email(),
      clubName: z.string(),
    }),
    handler: async (input, context) => {
      try {
        // 1. Authenticate with Google
        const auth = new JWT({
          email: import.meta.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          key: import.meta.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        // 2. Append to Google Sheet
        const spreadsheetId = import.meta.env.GOOGLE_SHEET_ID;
        const range = 'Sheet1!A:D';
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`;
        
        await auth.request({
          url,
          method: 'POST',
          data: {
            values: [[input.email, input.clubName, 'Pending', new Date().toISOString()]]
          }
        });

        // 3. Send Initial Email
        await resend.emails.send({
          from: 'Clubs <sid@alliedalgos.org>',
          to: input.email,
          subject: `Joining ${input.clubName}`,
          html: `<p>Thanks for your interest in <strong>${input.clubName}</strong>! Please complete your payment below.</p>`
        });

        // 4. Create Stripe Session
        const session = await stripe.checkout.sessions.create({
          ui_mode: 'embedded',
          customer_email: input.email,
          line_items: [{
            price_data: {
              currency: 'usd',
              product_data: { name: input.clubName },
              unit_amount: 1000, 
            },
            quantity: 1,
          }],
          mode: 'payment',
          return_url: `${context.url.origin}/return?session_id={CHECKOUT_SESSION_ID}`,
        });

        return { clientSecret: session.client_secret };

      } catch (e: any) {
        console.error('Checkout Error:', e);
        throw new ActionError({
          code: 'INTERNAL_SERVER_ERROR',
          message: e.message,
        });
      }
    }
  })
};