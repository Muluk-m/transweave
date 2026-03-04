import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/api/')) {
    const raw = process.env.NEXT_INTERNAL_API_URL || 'http://localhost:3001'
    const apiBaseUrl = raw.startsWith('http') ? raw : `https://${raw}`
    const url = new URL(pathname, apiBaseUrl)
    
    url.search = request.nextUrl.search
    
    return NextResponse.rewrite(url)
  }
} 