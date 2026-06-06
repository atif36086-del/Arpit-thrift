import { useRef } from "react";
import { useCart } from "@/lib/cart";
import { useCreateOrder, useCreatePaymentOrder, useVerifyPayment } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  image: string;
  order_id: string;
  handler: (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void;
  prefill: { name: string; contact: string };
  theme: { color: string };
  modal: { ondismiss: () => void };
}

interface RazorpayInstance {
  open: () => void;
}

const checkoutSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(10, "Valid phone number required"),
  address: z.string().min(10, "Full address required"),
  city: z.string().min(2, "City required"),
  state: z.string().min(2, "State required"),
  pincode: z.string().min(6, "Valid pincode required"),
  notes: z.string().optional(),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.getElementById("razorpay-script")) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.id = "razorpay-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function Checkout() {
  const { items, totalPrice, clearCart } = useCart();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const completedRef = useRef(false);

  const createOrder = useCreateOrder();
  const createPaymentOrder = useCreatePaymentOrder();
  const verifyPayment = useVerifyPayment();

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { fullName: "", phone: "", address: "", city: "", state: "", pincode: "", notes: "" },
  });

  if (items.length === 0 && !completedRef.current) {
    setLocation("/cart");
    return null;
  }

  const onSubmit = async (data: CheckoutFormValues) => {
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      toast({ title: "Could not load payment gateway", description: "Please check your internet connection.", variant: "destructive" });
      return;
    }

    const orderItems = items.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      productImage: item.product.images[0] || "",
      price: item.product.price,
      quantity: item.quantity,
      size: item.size || null,
      color: item.color || null,
    }));

    createOrder.mutate(
      { data: { ...data, items: orderItems, totalAmount: totalPrice } },
      {
        onSuccess: (order) => {
          createPaymentOrder.mutate(
            { data: { orderId: order.id } },
            {
              onSuccess: (paymentOrder) => {
                const options: RazorpayOptions = {
                  key: paymentOrder.keyId,
                  amount: paymentOrder.amount,
                  currency: paymentOrder.currency,
                  name: "Arpit Thrift",
                  description: `Order ${paymentOrder.orderRef}`,
                  image: "/logo.png",
                  order_id: paymentOrder.razorpayOrderId,
                  prefill: {
                    name: paymentOrder.customerName,
                    contact: paymentOrder.customerPhone,
                  },
                  theme: { color: "#000000" },
                  modal: {
                    ondismiss: () => {
                      toast({
                        title: "Payment cancelled",
                        description: "Your order is saved. Complete payment anytime from your order page.",
                      });
                      setLocation(`/order/${order.id}`);
                    },
                  },
                  handler: (response) => {
                    verifyPayment.mutate(
                      {
                        data: {
                          razorpay_order_id: response.razorpay_order_id,
                          razorpay_payment_id: response.razorpay_payment_id,
                          razorpay_signature: response.razorpay_signature,
                          orderId: order.id,
                        },
                      },
                      {
                        onSuccess: () => {
                          completedRef.current = true;
                          clearCart();
                          setLocation(`/order/${order.id}`);
                        },
                        onError: () => {
                          completedRef.current = true;
                          toast({ title: "Payment verification failed", description: "Contact support with your payment ID.", variant: "destructive" });
                          setLocation(`/order/${order.id}`);
                        },
                      }
                    );
                  },
                };

                const rzp = new window.Razorpay(options);
                rzp.open();
              },
              onError: () => {
                toast({ title: "Could not initialize payment", variant: "destructive" });
              },
            }
          );
        },
        onError: () => {
          toast({ title: "Failed to place order", variant: "destructive" });
        },
      }
    );
  };

  const isLoading = createOrder.isPending || createPaymentOrder.isPending || verifyPayment.isPending;

  return (
    <div className="container mx-auto px-4 py-24 min-h-screen">
      <h1 className="text-5xl font-black tracking-tighter uppercase mb-12">Checkout</h1>

      <div className="flex flex-col lg:flex-row gap-12">
        <div className="flex-1">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="fullName" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold uppercase text-xs">Full Name</FormLabel>
                    <FormControl><Input className="rounded-none border-black h-12" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold uppercase text-xs">Phone Number</FormLabel>
                    <FormControl><Input className="rounded-none border-black h-12" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold uppercase text-xs">Address</FormLabel>
                  <FormControl><Textarea className="rounded-none border-black resize-none" rows={3} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField control={form.control} name="city" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold uppercase text-xs">City</FormLabel>
                    <FormControl><Input className="rounded-none border-black h-12" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="state" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold uppercase text-xs">State</FormLabel>
                    <FormControl><Input className="rounded-none border-black h-12" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="pincode" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold uppercase text-xs">Pincode</FormLabel>
                    <FormControl><Input className="rounded-none border-black h-12" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold uppercase text-xs">Order Notes (Optional)</FormLabel>
                  <FormControl><Textarea className="rounded-none border-black resize-none" rows={2} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 bg-black text-white hover:bg-gray-900 rounded-none font-bold uppercase tracking-wider text-lg mt-8"
              >
                {isLoading ? "Processing..." : "Proceed to Payment"}
              </Button>

              <p className="text-xs text-center text-gray-400 mt-2">
                Secured by Razorpay · UPI, Cards, Net Banking accepted
              </p>
            </form>
          </Form>
        </div>

        <div className="w-full lg:w-96 shrink-0">
          <div className="bg-gray-50 p-6 border border-black/10 sticky top-24">
            <h2 className="text-xl font-bold uppercase mb-6 border-b border-black/10 pb-4">Order Summary</h2>
            <div className="space-y-4 mb-6 max-h-64 overflow-y-auto pr-2">
              {items.map((item, i) => (
                <div key={i} className="flex gap-4 text-sm">
                  <div className="w-16 h-20 bg-gray-200 shrink-0">
                    <img src={item.product.images[0] || `https://picsum.photos/seed/cap${item.product.id}/800/900`} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold line-clamp-1">{item.product.name}</p>
                    <p className="text-gray-500">Qty: {item.quantity}</p>
                    {(item.size || item.color) && (
                      <p className="text-gray-500 text-xs mt-1">{item.size}{item.color ? ` / ${item.color}` : ""}</p>
                    )}
                  </div>
                  <p className="font-bold">{formatCurrency(item.product.price * item.quantity)}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-black/10 pt-4 space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span><span>{formatCurrency(totalPrice)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Shipping</span><span className="text-green-600 font-medium">Free</span>
              </div>
            </div>
            <div className="border-t border-black pt-4">
              <div className="flex justify-between font-bold text-xl">
                <span>Total</span><span>{formatCurrency(totalPrice)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
