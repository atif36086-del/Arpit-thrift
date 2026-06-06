import { Product } from "@workspace/api-client-react/src/generated/api.schemas";
import { Link } from "wouter";
import { formatCurrency } from "@/lib/utils";
import { motion } from "framer-motion";

export function ProductCard({ product, index }: { product: Product; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group"
    >
      <Link href={`/products/${product.id}`} className="block relative aspect-[4/5] bg-gray-100 overflow-hidden mb-4">
        <img
          src={product.images[0] || `https://picsum.photos/seed/cap${product.id}/800/900`}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute top-2 left-2 flex flex-col gap-2">
          {product.isNew && (
            <span className="bg-white text-black text-xs font-bold px-2 py-1">NEW</span>
          )}
          {product.isBestSeller && (
            <span className="bg-black text-white text-xs font-bold px-2 py-1">BEST SELLER</span>
          )}
        </div>
        {!product.inStock && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] flex items-center justify-center">
            <span className="bg-black text-white text-sm font-bold px-4 py-2">SOLD OUT</span>
          </div>
        )}
      </Link>
      <div>
        <h3 className="font-bold text-sm truncate mb-1">{product.name}</h3>
        <p className="text-sm text-gray-600">{formatCurrency(product.price)}</p>
      </div>
    </motion.div>
  );
}
