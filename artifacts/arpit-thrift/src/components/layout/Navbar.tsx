import { Link } from "wouter";
import { useCart } from "@/lib/cart";
import { ShoppingBag, Search, Menu } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const { totalItems } = useCart();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 w-full z-50 transition-colors duration-300 ${
        isScrolled ? "bg-black text-white" : "bg-transparent text-white"
      }`}
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="md:hidden text-inherit hover:text-white hover:bg-white/10">
            <Menu className="w-5 h-5" />
          </Button>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href="/shop" className="hover:opacity-70 transition-opacity">Shop</Link>
            <Link href="/shop?category=new" className="hover:opacity-70 transition-opacity">New Arrivals</Link>
            <Link href="/shop?category=best" className="hover:opacity-70 transition-opacity">Best Sellers</Link>
          </nav>
        </div>

        <Link href="/" className="hover:opacity-80 transition-opacity flex items-center">
          <img
            src="/logo.png"
            alt="Arpit Thrift"
            className="h-12 w-auto object-contain"
            style={{ filter: "invert(1) brightness(2)" }}
          />
        </Link>

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="hidden md:flex text-inherit hover:text-white hover:bg-white/10">
            <Search className="w-5 h-5" />
          </Button>
          <Link href="/cart" className="relative p-2 hover:opacity-70 transition-opacity">
            <ShoppingBag className="w-5 h-5" />
            {totalItems > 0 && (
              <span className="absolute top-1 right-1 bg-white text-black text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                {totalItems}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
