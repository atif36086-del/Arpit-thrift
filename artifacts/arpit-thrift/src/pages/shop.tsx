import { useState } from "react";
import { useListProducts, ListProductsSortBy } from "@workspace/api-client-react";
import { ProductCard } from "@/components/ui/product-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, SlidersHorizontal } from "lucide-react";
import { useLocation } from "wouter";

export default function Shop() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>(searchParams.get("category") || "all");
  const [sortBy, setSortBy] = useState<ListProductsSortBy>(ListProductsSortBy.newest);

  const { data: products, isLoading } = useListProducts({
    search: search || undefined,
    category: category !== "all" ? category : undefined,
    sortBy,
  });

  return (
    <div className="container mx-auto px-4 py-24 min-h-screen">
      <div className="mb-12">
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase mb-8">Shop All</h1>
        
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input 
              placeholder="Search products..." 
              className="pl-10 h-12 rounded-none border-black focus-visible:ring-black"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex w-full md:w-auto gap-4">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full md:w-[180px] h-12 rounded-none border-black">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="rounded-none border-black">
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="caps">Caps</SelectItem>
                <SelectItem value="tees">T-Shirts</SelectItem>
                <SelectItem value="hoodies">Hoodies</SelectItem>
                <SelectItem value="new">New Arrivals</SelectItem>
                <SelectItem value="best">Best Sellers</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(val) => setSortBy(val as ListProductsSortBy)}>
              <SelectTrigger className="w-full md:w-[180px] h-12 rounded-none border-black">
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="rounded-none border-black">
                <SelectItem value={ListProductsSortBy.newest}>Newest</SelectItem>
                <SelectItem value={ListProductsSortBy.price_asc}>Price: Low to High</SelectItem>
                <SelectItem value={ListProductsSortBy.price_desc}>Price: High to Low</SelectItem>
                <SelectItem value={ListProductsSortBy.popular}>Popular</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="aspect-[4/5] bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : products?.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-xl text-gray-500 font-medium">No products found.</p>
          <Button 
            variant="outline" 
            className="mt-4 rounded-none border-black"
            onClick={() => {
              setSearch("");
              setCategory("all");
            }}
          >
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products?.map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
