import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["node:sqlite"],
  outputFileTracingIncludes: {
    "/api/filings/[id]/form2290": ["./public/forms/**/*"],
    "/api/filings/[id]/schedule1": ["./public/forms/**/*"],
    "/api/filings/[id]/voucher": ["./public/forms/**/*"],
  },
};

export default nextConfig;
