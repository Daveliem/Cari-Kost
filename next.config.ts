import type { NextConfig } from "next";

const allowedDevOrigins = process.env.ALLOWED_DEV_ORIGINS
  ? process.env.ALLOWED_DEV_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
  : ['recall-fondness-galleria.ngrok-free.dev'];

const nextConfig: NextConfig = {
  allowedDevOrigins,
};

export default nextConfig;
