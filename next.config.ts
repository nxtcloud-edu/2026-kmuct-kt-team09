import type { NextConfig } from "next";

// Amplify·Vercel은 기본 출력을 쓰고, 컨테이너(EC2 등)로 올릴 때만
// BUILD_STANDALONE=true 로 빌드해 최소 번들을 만든다.
const nextConfig: NextConfig = {
  ...(process.env.BUILD_STANDALONE === "true" ? { output: "standalone" as const } : {}),
};

export default nextConfig;
