/** @type {import('next').NextConfig} */
const isVercel = !!process.env.VERCEL;

const nextConfig = {
  // Vercel Hobby plan: use static export (zero serverless functions)
  // Docker: use standalone for self-contained server
  output: isVercel ? 'export' : 'standalone',

  // rewrites only work in dev (ignored with output: 'export')
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:3001/api/:path*',
      },
    ];
  },
};

export default nextConfig;
