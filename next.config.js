const withNextIntl = require('next-intl/plugin')(
  // Specify the path to the request config
  './src/i18n/request.ts'
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 14 uses App Router by default, no need for experimental.appDir
};

module.exports = withNextIntl(nextConfig);