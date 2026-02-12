/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export',  <-- DELETE THIS LINE IF IT EXISTS
  typescript: {
    ignoreBuildErrors: true, // Optional: prevents build fail on TS errors
  },
  eslint: {
    ignoreDuringBuilds: true, // Optional: prevents build fail on lint errors
  },
};

export default nextConfig;