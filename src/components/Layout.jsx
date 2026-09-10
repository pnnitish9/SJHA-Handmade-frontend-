import Navbar from "./Navbar.jsx";
import Footer from "./Footer.jsx";
import ChatWidget from "./ChatWidget.jsx";

export default function Layout({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-oat">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <ChatWidget />
    </div>
  );
}
