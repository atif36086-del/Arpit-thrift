import { useGetOrder, getGetOrderQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { CheckCircle2, Clock, Copy, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

export default function OrderConfirmation() {
  const { id } = useParams<{ id: string }>();
  const orderId = parseInt(id, 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: order, isLoading } = useGetOrder(orderId, {
    query: { enabled: !!orderId, queryKey: getGetOrderQueryKey(orderId) },
  });

  // Poll every 4 seconds while payment is still pending
  useEffect(() => {
    if (!order) return;
    if (order.paymentStatus === "paid") {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: getGetOrderQueryKey(orderId) });
    }, 4000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [order?.paymentStatus, orderId, queryClient]);

  const copyOrderId = () => {
    if (!order) return;
    navigator.clipboard.writeText(order.orderId);
    toast({ title: "Order ID copied to clipboard" });
  };

  const openWhatsApp = () => {
    if (!order) return;
    const itemsList = order.items
      .map(item => `${item.quantity}x ${item.productName}${item.size ? ` (Size: ${item.size})` : ""}`)
      .join("\n");
    const message = `Hi Arpit Thrift! I've placed order #${order.orderId}\nItems:\n${itemsList}\nTotal: ${formatCurrency(order.totalAmount)}\nName: ${order.fullName}\nPhone: ${order.phone}\nAddress: ${order.address}, ${order.city}, ${order.state} - ${order.pincode}`;
    window.open(`https://wa.me/918369221196?text=${encodeURIComponent(message)}`, "_blank");
  };

  if (isLoading) {
    return <div className="min-h-screen pt-24 animate-pulse bg-gray-50" />;
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center">
        <h1 className="text-4xl font-bold mb-4">Order Not Found</h1>
        <Link href="/"><Button variant="outline" className="rounded-none border-black">Return Home</Button></Link>
      </div>
    );
  }

  const isPaid = order.paymentStatus === "paid";

  return (
    <div className="container mx-auto px-4 py-24 min-h-screen flex flex-col items-center max-w-3xl">

      {/* Status icon */}
      <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-8 ${isPaid ? "bg-black text-white" : "bg-amber-100 text-amber-600"}`}>
        {isPaid
          ? <CheckCircle2 className="w-8 h-8" />
          : <Clock className="w-8 h-8 animate-pulse" />
        }
      </div>

      <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase mb-4 text-center">
        {isPaid ? "Order Confirmed!" : "Awaiting Payment"}
      </h1>
      <p className="text-gray-500 mb-8 text-center text-lg">
        {isPaid
          ? `Thank you, ${order.fullName}! Your payment was received.`
          : `Hi ${order.fullName}, your payment is being verified...`
        }
      </p>

      {/* Payment status badge */}
      <div className={`mb-6 px-4 py-2 text-sm font-bold uppercase tracking-wider rounded-none border ${
        isPaid
          ? "bg-green-50 text-green-700 border-green-200"
          : "bg-amber-50 text-amber-700 border-amber-200"
      }`}>
        {isPaid ? "✓ Payment Verified" : "⏳ Verifying payment..."}
      </div>

      {/* Order reference */}
      <div className="w-full bg-gray-50 p-6 border border-black/10 mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <p className="text-sm text-gray-500 uppercase font-bold mb-1">Order Number</p>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black tracking-tighter">{order.orderId}</span>
            <button onClick={copyOrderId} className="text-gray-400 hover:text-black">
              <Copy className="w-4 h-4" />
            </button>
          </div>
          {order.razorpayPaymentId && (
            <p className="text-xs text-gray-400 mt-1">Payment ID: {order.razorpayPaymentId}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500 uppercase font-bold mb-1">Total Amount</p>
          <p className="text-2xl font-black tracking-tighter">{formatCurrency(order.totalAmount)}</p>
        </div>
      </div>

      {/* Pending payment guidance */}
      {!isPaid && (
        <div className="w-full border border-amber-300 bg-amber-50 p-6 mb-8 text-center">
          <h2 className="text-lg font-bold uppercase mb-2">Payment Pending</h2>
          <p className="text-sm text-amber-800 mb-4">
            If you completed the payment in the Razorpay window, verification happens automatically. This page updates every few seconds.
          </p>
          <p className="text-xs text-amber-600">If you closed the payment window, please contact us via WhatsApp below.</p>
        </div>
      )}

      {/* WhatsApp CTA */}
      <div className="w-full border border-black p-6 mb-12 flex flex-col items-center text-center bg-black text-white">
        <MessageCircle className="w-12 h-12 mb-4 opacity-80" />
        <h2 className="text-xl font-bold uppercase mb-2">
          {isPaid ? "Track Your Order" : "Need Help?"}
        </h2>
        <p className="text-sm text-white/70 mb-6">
          {isPaid
            ? "We'll send your tracking details soon. Drop us a message on WhatsApp for updates."
            : "If there's any issue with your payment, message us on WhatsApp and we'll sort it out."
          }
        </p>
        <Button
          className="bg-[#25D366] hover:bg-[#128C7E] text-white rounded-none font-bold tracking-wide h-12 px-8"
          onClick={openWhatsApp}
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          {isPaid ? "Message on WhatsApp" : "Get Help on WhatsApp"}
        </Button>
      </div>

      {/* Order items */}
      <div className="w-full">
        <h3 className="text-xl font-bold uppercase mb-4">Order Items</h3>
        <div className="border-t border-black">
          {order.items.map((item, i) => (
            <div key={i} className="flex gap-4 py-4 border-b border-black/10">
              <img
                src={item.productImage || `https://picsum.photos/seed/cap${item.productId}/800/900`}
                className="w-16 h-20 object-cover bg-gray-100"
                alt=""
              />
              <div className="flex-1">
                <p className="font-bold">{item.productName}</p>
                <div className="text-sm text-gray-500">
                  Qty: {item.quantity}
                  {item.size && ` | Size: ${item.size}`}
                  {item.color && ` | Color: ${item.color}`}
                </div>
              </div>
              <p className="font-bold">{formatCurrency(item.price * item.quantity)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-12">
        <Link href="/shop">
          <Button variant="outline" className="rounded-none border-black font-bold uppercase tracking-wider">
            Continue Shopping
          </Button>
        </Link>
      </div>
    </div>
  );
}
