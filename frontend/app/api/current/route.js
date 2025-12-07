import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:9176';

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const response = await fetch(`${BACKEND_URL}/api/current`, {
      headers: {
        'Authorization': authHeader
      }
    });
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Fehler beim Abrufen der aktuellen Daten:', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Daten' }, { status: 500 });
  }
}
