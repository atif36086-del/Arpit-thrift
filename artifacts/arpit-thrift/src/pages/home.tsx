import { useListFeaturedProducts } from "@workspace/api-client-react";
import { ProductCard } from "@/components/ui/product-card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function Home() {
  const { data: featuredData, isLoading } = useListFeaturedProducts();

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative h-[100dvh] w-full bg-black text-white overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 z-0">
          <img 
            src="/hero.jpg" 
            alt="Hero background" 
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-black/40 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
        </div>
        
        <div className="container relative z-10 mx-auto px-4 flex flex-col items-center text-center mt-16">
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter uppercase mb-6"
          >
            Arpit Thrift
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="text-lg md:text-xl text-white/80 max-w-xl mb-10 lowercase normal-case"
          >
            Premium Indian streetwear and curated thrift caps. Authenticity in every stitch.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          >
            <Link href="/shop">
              <Button size="lg" className="bg-white text-black hover:bg-white/90 text-lg px-8 h-14 rounded-none font-bold uppercase tracking-wide">
                Shop Collection
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Featured Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-12">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tighter">Featured</h2>
            <Link href="/shop" className="text-sm font-bold uppercase tracking-wider underline underline-offset-4 hover:opacity-70">
              View All
            </Link>
          </div>
          
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="aspect-[4/5] bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredData?.featured?.slice(0, 4).map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Brand Story */}
      <section className="py-24 bg-black text-white">
        <div className="container mx-auto px-4 text-center max-w-4xl">
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-8">THE CULTURE</h2>
          <p className="text-lg md:text-2xl leading-relaxed text-white/80 lowercase normal-case">
            Born from the streets, built for the bold. Arpit Thrift isn't just about clothing; it's about making a statement without saying a word. We source the rarest caps and design premium streetwear for those who know the difference.
          </p>
        </div>
      </section>

      {/* New Arrivals & Best Sellers */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="mb-24">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tighter mb-12">New Arrivals</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredData?.newArrivals?.slice(0, 4).map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </div>
          </div>
          
          <div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tighter mb-12">Best Sellers</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredData?.bestSellers?.slice(0, 4).map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 bg-gray-50 border-t border-black/10">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-4xl font-bold tracking-tighter mb-12 text-center">FAQ</h2>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1" className="border-black/10">
              <AccordionTrigger className="text-lg font-bold hover:no-underline">How long does shipping take?</AccordionTrigger>
              <AccordionContent className="text-base text-gray-600">
                All orders are processed within 24 hours. Standard shipping takes 3-5 business days across India. Express shipping is available at checkout.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2" className="border-black/10">
              <AccordionTrigger className="text-lg font-bold hover:no-underline">Are the thrift caps authentic?</AccordionTrigger>
              <AccordionContent className="text-base text-gray-600">
                100%. Every single cap is hand-picked, authenticated, and restored before it hits our store. We don't deal in fakes.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3" className="border-black/10">
              <AccordionTrigger className="text-lg font-bold hover:no-underline">What's your return policy?</AccordionTrigger>
              <AccordionContent className="text-base text-gray-600">
                We offer a 7-day return policy for unused items in their original condition with tags attached. Thrift items are final sale.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4" className="border-black/10">
              <AccordionTrigger className="text-lg font-bold hover:no-underline">How do I pay via UPI?</AccordionTrigger>
              <AccordionContent className="text-base text-gray-600">
                After checkout, you'll be redirected to a payment page with our UPI ID and QR code. Complete the payment on any UPI app and click "I Have Paid" to confirm.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>
    </div>
  );
}
