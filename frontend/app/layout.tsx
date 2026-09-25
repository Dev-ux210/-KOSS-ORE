import "./globals.css"
import { TooltipProvider } from "@/components/ui/tooltip"

export const metadata = {
  title: "ORE — AI-Powered Academic Knowledge Base",
  description: "A self-hostable repository for indexing, chunking, and querying scientific literature and PDF documents.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-black min-h-screen font-sans">
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </body>
    </html>
  )
}