/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: process.env.NEXT_INTERNAL_API_URL + "/api/:path*",
      },
    ];
  },
};

export default nextConfig;
