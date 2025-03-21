import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET() {
  const clientId = process.env.NEXT_PUBLIC_42_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_42_REDIRECT_URI;

  const authUrl = `https://api.intra.42.fr/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code`;

  return NextResponse.json({ authUrl });
}

export async function POST(request: Request) {
  try {
    const { code } = await request.json();

    const tokenResponse = await axios.post('https://api.intra.42.fr/oauth/token', {
      grant_type: 'authorization_code',
      client_id: process.env.NEXT_PUBLIC_42_CLIENT_ID,
      client_secret: process.env.NEXT_PUBLIC_42_CLIENT_SECRET,
      code: code,
      redirect_uri: process.env.NEXT_PUBLIC_42_REDIRECT_URI,
    });

    return NextResponse.json(tokenResponse.data);
  } catch (error) {
    console.error('Erreur lors de l\'authentification:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'authentification' },
      { status: 500 }
    );
  }
}