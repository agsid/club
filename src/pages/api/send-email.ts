import type { APIRoute } from 'astro';
import { Resend } from 'resend';

export const POST: APIRoute = async ({ request }) => {
  const resend = new Resend("re_WhkU6sEM_EXSGbBUtn8YgotrG1iftkKSC");

  try {
    const body = await request.json();
    const { email, clubName } = body;

    const { data, error } = await resend.emails.send({
      from: 'club@resend.dev',
      to: [email], // Must be your Resend account email for sandbox testing
      subject: `Welcome to ${clubName}`,
      html: `<p>You've successfully joined <strong>${clubName}</strong>!</p>`,
    });

    if (error) return new Response(JSON.stringify({ error }), { status: 500 });

    return new Response(JSON.stringify({ success: true, id: data?.id }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};