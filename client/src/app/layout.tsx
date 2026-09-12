import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/context/AuthContext";
import { LocationProvider } from "@/context/LocationContext";
import LocationModal from "@/components/layout/LocationModal";

export const metadata: Metadata = {
  title: "CineBook — Your Ultimate Movie Booking Experience",
  description: "Book movie tickets instantly. Choose from thousands of movies, pick your seats, and enjoy the show. The smartest way to book cinema tickets.",
  keywords: "movie booking, cinema tickets, now playing movies, book tickets online",
  openGraph: {
    title: "CineBook — Movie Ticket Booking",
    description: "Book movie tickets online. Best seats, instant confirmation.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const apiHost = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api')
    .replace('/api', '');

  return (
    <html lang="en">
      <head>
        {/* Preconnect to the API server so the TCP/TLS handshake is done before
            the first data fetch — cuts perceived load time by ~200-500ms */}
        <link rel="preconnect" href={apiHost} />
        <link rel="dns-prefetch" href={apiHost} />
      </head>
      <body>
        <AuthProvider>
          <LocationProvider>
            <LocationModal />
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: "#1a1a26",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "10px",
                  fontSize: "14px",
                },
                success: { iconTheme: { primary: "#10b981", secondary: "#fff" } },
                error: { iconTheme: { primary: "#e50914", secondary: "#fff" } },
              }}
            />
          </LocationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
