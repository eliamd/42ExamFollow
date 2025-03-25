import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Utilisation de l'interface Request standard au lieu de NextRequest
export async function GET(
  request: Request,
  context: { params: { path: string[] } }
): Promise<Response> {
  try {
    const path = context.params.path.join('/');
    const searchParams = new URL(request.url).searchParams.toString();
    const queryString = searchParams ? `?${searchParams}` : '';

    const token = request.headers.get('Authorization');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const response = await fetch(
      `https://api.intra.42.fr/v2/${path}${queryString}`,
      {
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error: any) {
    console.error('API Proxy Error:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred while proxying the request' },
      { status: 500 }
    );
  }
}
