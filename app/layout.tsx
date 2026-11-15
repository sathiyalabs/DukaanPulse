import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "DukaanPulse · A reason for your next move",
  description:
    "Evidence you can inspect. Experiments you control. Team Trio, Merchant Growth AI.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-IN">
      <body>{children}</body>
    </html>
  );
}
