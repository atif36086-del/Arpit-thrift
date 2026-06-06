import { useState } from "react";
import { useGetProduct, getGetProductQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { Minus, Plus } from "lucide-react";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const productId = parseInt(id, 10);
  
  const { data: product, isLoading } = useGetProduct(productId, {
    query: { enabled: !!productId, queryKey: getGetProductQueryKey(productId) }
  });
  
  const { addToCart } = useCart();
  const { toast } = useToast();
  
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  if (isLoading) {
    return <div className="min-h-screen pt-24 animate-pulse bg-gray-50" />;
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-24 text-center">
        <h1 className="text-4xl font-bold mb-4">Product Not Found</h1>
        <Link href="/shop">
          <Button variant="outline" className="rounded-none border-black">Return to Shop</Button>
        </Link>
      </div>
    );
  }

  const images = product.images.length > 0 ? product.images : [
    `https://picsum.photos/seed/cap${product.id}/800/900`,
    `https://picsum.photos/seed/cap${product.id}-2/800/900`,
    `https://picsum.photos/seed/cap${product.id}-3/800/900`
  ];

  const handleAddToCart = () => {
    if (product.sizes?.length && !selectedSize) {
      toast({ title: "Please select a size", variant: "destructive" });
      return;
    }
    if (product.colors?.length && !selectedColor) {
      toast({ title: "Please select a color", variant: "destructive" });
      return;
    }

    addToCart(product, quantity, selectedSize, selectedColor);
    toast({ 
      title: "Added to cart", 
      description: `${quantity}x ${product.name} added to your cart.`
    });
  };

  return (
    <div className="container mx-auto px-4 py-24 min-h-screen">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-24">
        {/* Images */}
        <div className="space-y-4">
          <div className="aspect-[4/5] bg-gray-100 overflow-hidden relative">
            <img 
              src={images[activeImage]} 
              alt={product.name}
              className="w-full h-full object-cover"
            />
            {product.isNew && (
              <span className="absolute top-4 left-4 bg-white text-black text-xs font-bold px-3 py-1">NEW</span>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {images.map((img, i) => (
                <button 
                  key={i} 
                  onClick={() => setActiveImage(i)}
                  className={`w-20 h-24 shrink-0 overflow-hidden border-2 ${activeImage === i ? 'border-black' : 'border-transparent'}`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col pt-4">
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase mb-4">{product.name}</h1>
            <div className="flex items-center gap-4 text-2xl">
              <span className="font-bold">{formatCurrency(product.price)}</span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="text-gray-400 line-through text-lg">{formatCurrency(product.originalPrice)}</span>
              )}
            </div>
          </div>

          <div className="prose prose-sm max-w-none text-gray-600 mb-8 lowercase normal-case">
            <p>{product.description || "Premium quality. Crafted with precision."}</p>
          </div>

          {/* Options */}
          <div className="space-y-6 mb-12">
            {product.sizes && product.sizes.length > 0 && (
              <div>
                <div className="flex justify-between mb-3">
                  <span className="font-bold uppercase text-sm">Size</span>
                  <button className="text-sm text-gray-500 underline">Size Guide</button>
                </div>
                <div className="flex flex-wrap gap-3">
                  {product.sizes.map(size => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`h-12 px-6 border font-medium text-sm transition-colors ${
                        selectedSize === size 
                          ? 'border-black bg-black text-white' 
                          : 'border-gray-200 hover:border-black text-black'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {product.colors && product.colors.length > 0 && (
              <div>
                <span className="font-bold uppercase text-sm block mb-3">Color</span>
                <div className="flex flex-wrap gap-3">
                  {product.colors.map(color => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`h-12 px-6 border font-medium text-sm transition-colors capitalize ${
                        selectedColor === color 
                          ? 'border-black bg-black text-white' 
                          : 'border-gray-200 hover:border-black text-black'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <span className="font-bold uppercase text-sm block mb-3">Quantity</span>
              <div className="flex items-center border border-black w-32">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-12 flex items-center justify-center hover:bg-gray-100 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="flex-1 text-center font-medium">{quantity}</span>
                <button 
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-12 flex items-center justify-center hover:bg-gray-100 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <Button 
            size="lg" 
            onClick={handleAddToCart}
            disabled={!product.inStock}
            className="w-full h-14 rounded-none bg-black hover:bg-gray-900 text-white font-bold uppercase tracking-wider text-lg"
          >
            {product.inStock ? "Add to Cart" : "Sold Out"}
          </Button>
          
          <div className="mt-8 border-t border-gray-200 pt-8 space-y-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>{product.inStock ? "In Stock - Ready to ship" : "Currently out of stock"}</span>
            </div>
            <p>100% Authentic Guarantee</p>
            <p>Free shipping on orders over ₹2000</p>
          </div>
        </div>
      </div>
    </div>
  );
}
