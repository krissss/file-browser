import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone', // 启用 standalone 输出用于 Docker 部署
};

export default nextConfig;
