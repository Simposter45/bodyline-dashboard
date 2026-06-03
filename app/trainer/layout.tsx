import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trainer Portal - Bodyline",
  description: "Bodyline Gym Trainer Portal",
  manifest: "/trainer-manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Trainer",
  },
};

export default function TrainerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
