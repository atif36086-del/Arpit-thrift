import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Minus, Plus, Trash2 } from "lucide-react";

export default function Cart() {
  const { items, updateQuantity, removeFromCart, totalPrice } = useCart();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-32 min-h-screen flex flex-col items-center justify-center text-center">
        <h1 className="text-5xl font-black tracking-tighter uppercase mb-6">Your Cart is Empty</h1>
        <p className="text-gray-500 mb-8 max-w-md">Looks like you haven't added anything to your cart yet.</p>
        <Link href="/shop">
          <Button size="lg" className="bg-black text-white hover:bg-gray-900 rounded-none px-8 font-bold uppercase tracking-wider h-14">
            Continue Shopping
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-24 min-h-screen">
      <h1 className="text-5xl font-black tracking-tighter uppercase mb-12">Cart</h1>
      
      <div className="flex flex-col lg:flex-row gap-12">
        <div className="flex-1">
          <div className="border-t border-black">
            {items.map((item) => (
              <div key={`${item.product.id}-${item.size}-${item.color}`} className="flex py-6 border-b border-black/10">
                <Link href={`/products/${item.product.id}`} className="w-24 h-32 bg-gray-100 shrink-0">
                  <img 
                    src={item.product.images[0] || `https://picsum.photos/seed/cap${item.product.id}/800/900`} 
                    alt={item.product.name} 
                    className="w-full h-full object-cover"
                  />
                </Link>
                <div className="ml-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start">
                    <div>
                      <Link href={`/products/${item.product.id}`} className="font-bold hover:underline">
                        {item.product.name}
                      </Link>
                      <div className="text-sm text-gray-500 mt-1 space-y-1">
                        {item.size && <p>Size: {item.size}</p>}
                        {item.color && <p>Color: {item.color}</p>}
                      </div>
                    </div>
                    <p className="font-bold">{formatCurrency(item.product.price)}</p>
                  </div>
                  
                  <div className="mt-auto flex justify-between items-center">
                    <div className="flex items-center border border-black">
                      <button 
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.size, item.color)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 transition-colors"
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.size, item.color)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <button 
                      onClick={() => removeFromCart(item.product.id, item.size, item.color)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="w-full lg:w-96 shrink-0">
          <div className="bg-gray-50 p-6 border border-black/10">
            <h2 className="text-xl font-bold uppercase mb-6">Order Summary</h2>
            <div className="space-y-4 text-sm mb-6">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(totalPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>Calculated at checkout</span>
              </div>
            </div>
            <div className="border-t border-black/10 pt-4 mb-8">
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{formatCurrency(totalPrice)}</span>
              </div>
            </div>
            <Link href="/checkout">
              <Button className="w-full h-14 bg-black text-white hover:bg-gray-900 rounded-none font-bold uppercase tracking-wider">
                Proceed to Checkout
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
