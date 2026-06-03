import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Member Portal - Bodyline",
  description: "Bodyline Gym Member Portal",
  manifest: "/member-manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Member",
  },
};

export default function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
