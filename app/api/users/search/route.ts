import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: Request) {
  // try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const authHeader = request.headers.get('authorization');

    if (!query) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header is required' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');

    const response = await axios.get(`https://api.intra.42.fr/v2/users`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      params: {
        'filter[login]': query,

      },
    });

    return NextResponse.json(response.data);
  // } catch (error) {
  //   console.error('Error searching users:', error);
  //   return NextResponse.json(
  //     { error: 'Erreur lors de la recherche' },
  //     { status: 500 }
  //   );
  // }
} 