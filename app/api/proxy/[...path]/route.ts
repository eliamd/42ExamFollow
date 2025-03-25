import { NextRequest, NextResponse } from 'next/server';

// Configuration pour une API dynamique sans cache
export const dynamic = 'force-dynamic';

// Déclaration du type pour les params
type PathParams = Promise<{ path: string[] }>;

// Fonction de routage GET avec params asynchrones pour Next.js 15
export async function GET(
  req: NextRequest,
  { params }: { params: PathParams }
) {
  try {
    // Attendre la résolution de la Promise params
    const resolvedParams = await params;
    // Reconstruire le chemin depuis le paramètre path[]
    const path = resolvedParams.path.join('/');

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
