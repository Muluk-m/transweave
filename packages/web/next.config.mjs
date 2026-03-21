/** @type {import('next').NextConfig} */
const nextConfig = {
  // standalone is for Docker; skip it on Vercel so pages can be static (CDN-served)
  ...(process.env.VERCEL ? {} : { output: 'standalone' }),

  async redirects() {
    return [
      {
        source: '/team/:teamId',
        destination: '/',
        permanent: false,
      },
    ];
  },

  async rewrites() {
    const apiUrl = process.env.NEXT_INTERNAL_API_URL || 'http://127.0.0.1:3001';
    const destination = apiUrl.startsWith('http') ? apiUrl : `https://${apiUrl}`;
    return [
      {
        source: '/api/:path*',
        destination: `${destination}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
