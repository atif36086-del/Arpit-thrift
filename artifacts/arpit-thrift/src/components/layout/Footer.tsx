import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="bg-black text-white border-t border-white/10 pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-2">
            <img
              src="/logo.png"
              alt="Arpit Thrift"
              className="h-16 w-auto object-contain mb-4"
              style={{ filter: "invert(1) brightness(2)" }}
            />
            <p className="text-white/60 max-w-sm mb-6 lowercase normal-case">
              Premium Indian streetwear and thrift caps. Curated for the culture.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-4">Shop</h4>
            <ul className="space-y-2 text-sm text-white/60">
              <li><Link href="/shop" className="hover:text-white transition-colors">All Products</Link></li>
              <li><Link href="/shop?category=new" className="hover:text-white transition-colors">New Arrivals</Link></li>
              <li><Link href="/shop?category=best" className="hover:text-white transition-colors">Best Sellers</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Support</h4>
            <ul className="space-y-2 text-sm text-white/60">
              <li><Link href="/" className="hover:text-white transition-colors">FAQ</Link></li>
              <li><Link href="/" className="hover:text-white transition-colors">Shipping</Link></li>
              <li><Link href="/" className="hover:text-white transition-colors">Returns</Link></li>
            </ul>
          </div>
        </div>
        <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-white/10 text-xs text-white/40">
          <p>© {new Date().getFullYear()} Arpit Thrift. All rights reserved.</p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <Link href="/admin/login" className="hover:text-white transition-colors">Admin Login</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
