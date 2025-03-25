import { NextRequest, NextResponse } from 'next/server';

// Configuration pour une API dynamique sans cache
export const dynamic = 'force-dynamic';

// Fonction de routage GET simplifiée avec la signature exacte attendue par Next.js 15.2.3
export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // Reconstruire le chemin depuis le paramètre path[]
    const path = params.path.join('/');

    // Extraire les paramètres de la requête
    const searchParams = new URL(req.url).searchParams.toString();
    const queryString = searchParams ? `?${searchParams}` : '';

    // Récupérer le token d'authentification
    const token = req.headers.get('Authorization');
    if (!token) {
      return NextResponse.json(
        { error: 'Token d\'authentification manquant' },
        { status: 401 }
      );
    }

    // Effectuer la requête vers l'API 42
    const response = await fetch(
      `https://api.intra.42.fr/v2/${path}${queryString}`,
      {
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: `L'API 42 a répondu avec le statut: ${response.status}` },
        { status: response.status }
      );
    }

    // Récupérer les données JSON
    const data = await response.json();

    // Renvoyer la réponse avec le même statut
    return NextResponse.json(data);
  } catch (error) {
    console.error('Erreur proxy API:', error);

    // Retourner une erreur générique
    return NextResponse.json(
      { error: 'Une erreur est survenue lors du traitement de votre demande' },
      { status: 500 }
    );
  }
}
