import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect('/');
  }

  try {
    const tokenResponse = await axios.post('https://api.intra.42.fr/oauth/token', {
      grant_type: 'authorization_code',
      client_id: process.env.NEXT_PUBLIC_42_CLIENT_ID,
      client_secret: process.env.NEXT_PUBLIC_42_CLIENT_SECRET,
      code: code,
      redirect_uri: process.env.NEXT_PUBLIC_42_REDIRECT_URI,
    });

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authentification réussie</title>
        </head>
        <body>
          <script>
            window.localStorage.setItem('42_access_token', '${tokenResponse.data.access_token}');
            window.location.href = '/';
          </script>
        </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (error) {
    console.error('Erreur lors de l\'authentification:', error);
    return NextResponse.redirect('/');
  }
}