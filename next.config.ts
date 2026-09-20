import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 컨테이너 배포(App Runner·EC2)용 최소 번들. Vercel 배포에는 영향 없다.
  output: "standalone",
};

export default nextConfig;
