import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json(
      { error: 'Code d\'autorisation manquant' },
      { status: 400 }
    );
  }

  try {
    // Récupération du token d'accès
    const tokenResponse = await axios.post('https://api.intra.42.fr/oauth/token', {
      grant_type: 'authorization_code',
      client_id: process.env.NEXT_PUBLIC_42_CLIENT_ID,
      client_secret: process.env.NEXT_PUBLIC_42_CLIENT_SECRET,
      code: code,
      redirect_uri: process.env.NEXT_PUBLIC_42_REDIRECT_URI
    });

    const accessToken = tokenResponse.data.access_token;

    // Vérifier que le token a bien été récupéré
    if (!accessToken) {
      throw new Error('Token d\'accès non fourni par l\'API 42');
    }

    // Utiliser l'URL d'origine de la requête pour construire la redirection
    const protocol = request.nextUrl.protocol; // http: ou https:
    const host = request.headers.get('host') || 'localhost:3000';

    // Construire une URL absolue basée sur la requête actuelle
    const baseUrl = `${protocol}//${host}`;

    // Afficher des informations de débogage dans les logs
    console.log('Informations de redirection:');
    console.log(`- Protocol: ${protocol}`);
    console.log(`- Host: ${host}`);
    console.log(`- Base URL: ${baseUrl}`);

    // Rediriger avec le token dans les paramètres
    const redirectUrl = new URL('/', baseUrl);
    redirectUrl.searchParams.set('token', accessToken);

    console.log(`- Redirection vers: ${redirectUrl.toString()}`);

    return NextResponse.redirect(redirectUrl.toString());
  } catch (error: any) {
    console.error('Erreur lors de l\'authentification:', error);

    // Logs détaillés pour identifier la source de l'erreur
    if (error.response) {
      console.error('Réponse d\'erreur API:', {
        status: error.response.status,
        data: error.response.data
      });
    }

    // Obtenir l'URL de base à partir de la requête
    const protocol = request.nextUrl.protocol;
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}//${host}`;

    // Rediriger vers la page d'erreur
    const errorUrl = new URL('/auth-error', baseUrl);
    return NextResponse.redirect(errorUrl.toString());
  }
}