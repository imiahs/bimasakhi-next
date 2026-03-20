import { NextResponse } from 'next/server';

export async function GET(request) {
    return NextResponse.json({ success: true, message: 'Test GET Route mapping correctly' });
}

export async function POST(request) {
    return NextResponse.json({ success: true, message: 'Test POST Route mapping correctly' });
}
