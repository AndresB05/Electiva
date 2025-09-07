const withNextIntl = require('next-intl/plugin')();

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 14 uses App Router by default, no need for experimental.appDir
};

module.exports = withNextIntl(nextConfig);