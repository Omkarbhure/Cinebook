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
  return (
    <html lang="en">
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
