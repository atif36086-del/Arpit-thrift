import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useGetAdminStats,
  useListOrders,
  useUpdateOrderStatus,
  useListProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  getGetAdminStatsQueryKey,
  getListOrdersQueryKey,
  getListProductsQueryKey,
} from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Package, ShoppingBag, X, MessageCircle, Copy, MapPin, Phone, User, ChevronRight, Bell, BellOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type OrderStatus = "pending_payment" | "payment_verified" | "shipped" | "delivered" | "cancelled";

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.coerce.number().positive("Price must be positive"),
  originalPrice: z.coerce.number().optional().or(z.literal("")),
  category: z.string().min(1, "Category is required"),
  images: z.string().min(1, "At least one image URL is required"),
  sizes: z.string().optional(),
  colors: z.string().optional(),
  inStock: z.boolean(),
  stockCount: z.coerce.number().int().optional().or(z.literal("")),
  isNew: z.boolean(),
  isBestSeller: z.boolean(),
  isFeatured: z.boolean(),
});

type ProductFormValues = z.infer<typeof productSchema>;

type ProductRow = {
  id: number;
  name: string;
  price: number;
  originalPrice?: number | null;
  category: string;
  images: string[];
  sizes: string[];
  colors: string[];
  description?: string | null;
  inStock: boolean;
  stockCount?: number | null;
  isNew: boolean;
  isBestSeller: boolean;
  isFeatured: boolean;
  tags: string[];
  createdAt: string;
};

function statusLabel(s: string) {
  return {
    pending_payment: "Pending Payment",
    payment_verified: "Payment Verified",
    shipped: "Shipped",
    delivered: "Delivered",
    cancelled: "Cancelled",
  }[s] ?? s;
}

function statusColor(s: string) {
  return {
    pending_payment: "bg-yellow-100 text-yellow-800",
    payment_verified: "bg-blue-100 text-blue-800",
    shipped: "bg-purple-100 text-purple-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  }[s] ?? "bg-gray-100 text-gray-800";
}

type OrderRow = {
  id: number;
  orderId: string;
  fullName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  items: Array<{ productId: number; productName: string; productImage: string; price: number; quantity: number; size: string | null; color: string | null; }>;
  totalAmount: number;
  status: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("orders");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);
  const [deleteProductId, setDeleteProductId] = useState<number | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { signOut, user } = useAuth();
  const { subscribed, loading: pushLoading, enable: enablePush, disable: disablePush, permission: pushPermission } = usePushNotifications();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await signOut();
    // ProtectedRoute handles the redirect once session clears — no navigate needed
  };

  const { data: stats, isLoading: statsLoading } = useGetAdminStats();
  const { data: orders, isLoading: ordersLoading } = useListOrders(
    orderStatusFilter === "all" ? undefined : { status: orderStatusFilter as any }
  );
  const { data: products, isLoading: productsLoading } = useListProducts();

  const updateStatus = useUpdateOrderStatus();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      originalPrice: "",
      category: "",
      images: "",
      sizes: "",
      colors: "",
      inStock: true,
      stockCount: "",
      isNew: false,
      isBestSeller: false,
      isFeatured: false,
    },
  });

  const openAddDialog = () => {
    setEditingProduct(null);
    form.reset({
      name: "",
      description: "",
      price: 0,
      originalPrice: "",
      category: "",
      images: "",
      sizes: "",
      colors: "",
      inStock: true,
      stockCount: "",
      isNew: false,
      isBestSeller: false,
      isFeatured: false,
    });
    setProductDialogOpen(true);
  };

  const openEditDialog = (p: ProductRow) => {
    setEditingProduct(p);
    form.reset({
      name: p.name,
      description: p.description ?? "",
      price: p.price,
      originalPrice: p.originalPrice ?? "",
      category: p.category,
      images: p.images.join(", "),
      sizes: p.sizes.join(", "),
      colors: p.colors.join(", "),
      inStock: p.inStock,
      stockCount: p.stockCount ?? "",
      isNew: p.isNew,
      isBestSeller: p.isBestSeller,
      isFeatured: p.isFeatured,
    });
    setProductDialogOpen(true);
  };

  const onProductSubmit = (values: ProductFormValues) => {
    const payload = {
      name: values.name,
      description: values.description || undefined,
      price: values.price,
      originalPrice: values.originalPrice ? Number(values.originalPrice) : null,
      images: values.images.split(",").map(s => s.trim()).filter(Boolean),
      category: values.category,
      sizes: values.sizes ? values.sizes.split(",").map(s => s.trim()).filter(Boolean) : [],
      colors: values.colors ? values.colors.split(",").map(s => s.trim()).filter(Boolean) : [],
      inStock: values.inStock,
      stockCount: values.stockCount ? Number(values.stockCount) : null,
      isNew: values.isNew,
      isBestSeller: values.isBestSeller,
      isFeatured: values.isFeatured,
      tags: [],
    };

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
      setProductDialogOpen(false);
    };

    if (editingProduct) {
      updateProduct.mutate({ id: editingProduct.id, data: payload }, { onSuccess: invalidate });
    } else {
      createProduct.mutate({ data: payload }, { onSuccess: invalidate });
    }
  };

  const handleDeleteProduct = () => {
    if (deleteProductId == null) return;
    deleteProduct.mutate(
      { id: deleteProductId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
          setDeleteProductId(null);
        },
      }
    );
  };

  const handleOrderStatusChange = (orderId: number, newStatus: OrderStatus) => {
    updateStatus.mutate(
      { id: orderId, data: { status: newStatus } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
        },
      }
    );
  };

  const statCards = [
    { label: "Total Revenue", value: formatCurrency(stats?.totalRevenue || 0) },
    { label: "Total Orders", value: stats?.totalOrders ?? "-" },
    { label: "Pending Payment", value: stats?.pendingPayment ?? "-" },
    { label: "Verified", value: stats?.paymentVerified ?? "-" },
    { label: "Shipped", value: stats?.shipped ?? "-" },
    { label: "Delivered", value: stats?.delivered ?? "-" },
    { label: "Products", value: stats?.totalProducts ?? "-" },
  ];

  const isSaving = createProduct.isPending || updateProduct.isPending;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-black text-white px-6 py-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase">Admin Dashboard</h1>
            <p className="text-white/50 text-sm mt-1 uppercase tracking-widest">Arpit Thrift</p>
          </div>
          <div className="flex items-center gap-3">
            {user?.email && (
              <span className="text-white/40 text-xs hidden sm:block">{user.email}</span>
            )}
            {pushPermission !== "unsupported" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={subscribed ? disablePush : enablePush}
                disabled={pushLoading}
                title={subscribed ? "Disable order notifications" : "Enable order notifications"}
                className={`text-xs border rounded-none px-3 gap-1.5 uppercase tracking-wider ${
                  subscribed
                    ? "text-green-400 border-green-500/40 hover:bg-green-500/10"
                    : "text-white/50 border-white/20 hover:text-white hover:bg-white/10"
                }`}
              >
                {subscribed ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{subscribed ? "Alerts On" : "Alerts Off"}</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="text-white/70 hover:text-white hover:bg-white/10 border border-white/20 rounded-none text-xs uppercase tracking-wider px-4 disabled:opacity-50"
            >
              {isLoggingOut ? "Signing out…" : "Logout"}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
          {statCards.map((stat, i) => (
            <div key={i} className="bg-white p-4 border border-black/10 shadow-sm">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{stat.label}</p>
              <p className="text-2xl font-black tracking-tighter">
                {statsLoading ? "—" : stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="rounded-none border border-black bg-transparent h-11 p-0 mb-6">
            <TabsTrigger
              value="orders"
              className="rounded-none data-[state=active]:bg-black data-[state=active]:text-white px-6 h-full gap-2 font-bold uppercase text-xs tracking-widest"
            >
              <ShoppingBag className="w-4 h-4" />
              Orders
            </TabsTrigger>
            <TabsTrigger
              value="products"
              className="rounded-none data-[state=active]:bg-black data-[state=active]:text-white px-6 h-full gap-2 font-bold uppercase text-xs tracking-widest"
            >
              <Package className="w-4 h-4" />
              Products
            </TabsTrigger>
          </TabsList>

          {/* ── ORDERS TAB ── */}
          <TabsContent value="orders">
            <div className="bg-white border border-black/10 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-black/10 flex flex-wrap gap-3 items-center justify-between">
                <h2 className="text-base font-black uppercase tracking-wider">All Orders</h2>
                <div className="flex gap-1 overflow-x-auto pb-1 flex-nowrap shrink-0 max-w-full">
                  {(["all", "pending_payment", "payment_verified", "shipped", "delivered"] as const).map(s => {
                    const label = s === "all" ? "All" : s === "pending_payment" ? "Pending" : s === "payment_verified" ? "Verified" : s === "shipped" ? "Shipped" : "Delivered";
                    return (
                      <button
                        key={s}
                        onClick={() => setOrderStatusFilter(s)}
                        className={`shrink-0 px-3 py-1.5 text-xs font-bold uppercase tracking-wider border transition-colors whitespace-nowrap ${
                          orderStatusFilter === s
                            ? "bg-black text-white border-black"
                            : "bg-white text-black border-black/20 hover:border-black"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-black/10 hover:bg-transparent">
                      <TableHead className="font-black uppercase text-xs tracking-wider text-black">Order ID</TableHead>
                      <TableHead className="font-black uppercase text-xs tracking-wider text-black">Customer</TableHead>
                      <TableHead className="font-black uppercase text-xs tracking-wider text-black">Items</TableHead>
                      <TableHead className="font-black uppercase text-xs tracking-wider text-black">Date</TableHead>
                      <TableHead className="font-black uppercase text-xs tracking-wider text-black">Amount</TableHead>
                      <TableHead className="font-black uppercase text-xs tracking-wider text-black">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ordersLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-gray-400">Loading orders...</TableCell>
                      </TableRow>
                    ) : !orders?.length ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-gray-400">No orders found.</TableCell>
                      </TableRow>
                    ) : (
                      orders.map(order => (
                        <TableRow
                          key={order.id}
                          className="border-black/5 cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => setSelectedOrder(order as unknown as OrderRow)}
                        >
                          <TableCell className="font-mono font-bold text-sm">
                            <span className="flex items-center gap-1">
                              {order.orderId}
                              <ChevronRight className="w-3 h-3 text-gray-400" />
                            </span>
                          </TableCell>
                          <TableCell>
                            <p className="font-bold text-sm">{order.fullName}</p>
                            <p className="text-xs text-gray-400">{order.phone}</p>
                            <p className="text-xs text-gray-400">{order.city}, {order.state}</p>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {(order.items as any[]).length} item{(order.items as any[]).length !== 1 ? "s" : ""}
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          </TableCell>
                          <TableCell className="font-black text-sm">{formatCurrency(order.totalAmount)}</TableCell>
                          <TableCell onClick={e => e.stopPropagation()}>
                            <Select
                              value={order.status}
                              onValueChange={val => handleOrderStatusChange(order.id, val as OrderStatus)}
                              disabled={updateStatus.isPending}
                            >
                              <SelectTrigger className="w-[170px] h-8 rounded-none border-black/20 text-xs font-bold">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-none border-black">
                                <SelectItem value="pending_payment">Pending Payment</SelectItem>
                                <SelectItem value="payment_verified">Payment Verified</SelectItem>
                                <SelectItem value="shipped">Shipped</SelectItem>
                                <SelectItem value="delivered">Delivered</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* ── PRODUCTS TAB ── */}
          <TabsContent value="products">
            <div className="bg-white border border-black/10 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-black/10 flex items-center justify-between">
                <h2 className="text-base font-black uppercase tracking-wider">All Products</h2>
                <Button
                  onClick={openAddDialog}
                  className="rounded-none bg-black text-white hover:bg-black/80 uppercase text-xs font-bold tracking-widest gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Product
                </Button>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-black/10 hover:bg-transparent">
                      <TableHead className="font-black uppercase text-xs tracking-wider text-black w-16">Image</TableHead>
                      <TableHead className="font-black uppercase text-xs tracking-wider text-black">Product</TableHead>
                      <TableHead className="font-black uppercase text-xs tracking-wider text-black">Category</TableHead>
                      <TableHead className="font-black uppercase text-xs tracking-wider text-black">Price</TableHead>
                      <TableHead className="font-black uppercase text-xs tracking-wider text-black">Stock</TableHead>
                      <TableHead className="font-black uppercase text-xs tracking-wider text-black">Badges</TableHead>
                      <TableHead className="font-black uppercase text-xs tracking-wider text-black w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productsLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-gray-400">Loading products...</TableCell>
                      </TableRow>
                    ) : !products?.length ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-gray-400">No products yet. Add your first one.</TableCell>
                      </TableRow>
                    ) : (
                      products.map(p => (
                        <TableRow key={p.id} className="border-black/5">
                          <TableCell>
                            <img
                              src={p.images[0] ?? "https://picsum.photos/seed/placeholder/60/60"}
                              alt={p.name}
                              className="w-12 h-12 object-cover border border-black/10"
                            />
                          </TableCell>
                          <TableCell>
                            <p className="font-bold text-sm">{p.name}</p>
                            {p.description && (
                              <p className="text-xs text-gray-400 line-clamp-1 max-w-xs">{p.description}</p>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-xs font-bold uppercase tracking-wider bg-black/5 px-2 py-1">
                              {p.category}
                            </span>
                          </TableCell>
                          <TableCell>
                            <p className="font-black text-sm">{formatCurrency(p.price)}</p>
                            {p.originalPrice && (
                              <p className="text-xs text-gray-400 line-through">{formatCurrency(p.originalPrice)}</p>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className={`text-xs font-bold uppercase px-2 py-1 ${p.inStock ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                              {p.inStock ? `In Stock${p.stockCount ? ` (${p.stockCount})` : ""}` : "Out of Stock"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {p.isNew && <span className="text-xs font-bold bg-black text-white px-1.5 py-0.5">NEW</span>}
                              {p.isBestSeller && <span className="text-xs font-bold bg-yellow-400 text-black px-1.5 py-0.5">BEST</span>}
                              {p.isFeatured && <span className="text-xs font-bold bg-blue-600 text-white px-1.5 py-0.5">FEAT</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <button
                                onClick={() => openEditDialog(p as ProductRow)}
                                className="p-1.5 border border-black/20 hover:border-black hover:bg-black hover:text-white transition-colors"
                                title="Edit"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteProductId(p.id)}
                                className="p-1.5 border border-black/20 hover:border-red-500 hover:bg-red-500 hover:text-white transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── ADD / EDIT PRODUCT DIALOG ── */}
      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-none border-black">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-wider text-lg">
              {editingProduct ? "Edit Product" : "Add New Product"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onProductSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel className="text-xs font-bold uppercase tracking-wider">Product Name *</FormLabel>
                      <FormControl>
                        <Input {...field} className="rounded-none border-black/30 focus-visible:ring-0 focus-visible:border-black" placeholder="Vintage Snapback Pro" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel className="text-xs font-bold uppercase tracking-wider">Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} className="rounded-none border-black/30 focus-visible:ring-0 focus-visible:border-black resize-none" placeholder="Premium quality cap..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider">Price (₹) *</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" className="rounded-none border-black/30 focus-visible:ring-0 focus-visible:border-black" placeholder="799" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="originalPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider">Original Price (₹)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" className="rounded-none border-black/30 focus-visible:ring-0 focus-visible:border-black" placeholder="1299 (optional)" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider">Category *</FormLabel>
                      <FormControl>
                        <Input {...field} className="rounded-none border-black/30 focus-visible:ring-0 focus-visible:border-black" placeholder="Snapback, Fitted, Dad Hat..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="stockCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider">Stock Count</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" className="rounded-none border-black/30 focus-visible:ring-0 focus-visible:border-black" placeholder="e.g. 15" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="images"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel className="text-xs font-bold uppercase tracking-wider">Image URLs * <span className="font-normal normal-case text-gray-400">(comma-separated)</span></FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={2} className="rounded-none border-black/30 focus-visible:ring-0 focus-visible:border-black resize-none text-sm" placeholder="https://picsum.photos/seed/cap1/800/900, https://..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sizes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider">Sizes <span className="font-normal normal-case text-gray-400">(comma-separated)</span></FormLabel>
                      <FormControl>
                        <Input {...field} className="rounded-none border-black/30 focus-visible:ring-0 focus-visible:border-black" placeholder="One Size, S/M, L/XL" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="colors"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider">Colors <span className="font-normal normal-case text-gray-400">(comma-separated)</span></FormLabel>
                      <FormControl>
                        <Input {...field} className="rounded-none border-black/30 focus-visible:ring-0 focus-visible:border-black" placeholder="Black, White, Navy" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Toggles */}
              <div className="border border-black/10 p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                {(["inStock", "isNew", "isBestSeller", "isFeatured"] as const).map(key => (
                  <FormField
                    key={key}
                    control={form.control}
                    name={key}
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value as boolean}
                            onCheckedChange={field.onChange}
                            className="rounded-none border-black data-[state=checked]:bg-black data-[state=checked]:border-black"
                          />
                        </FormControl>
                        <FormLabel className="text-xs font-bold uppercase tracking-wider cursor-pointer">
                          {{ inStock: "In Stock", isNew: "New", isBestSeller: "Best Seller", isFeatured: "Featured" }[key]}
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </div>

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setProductDialogOpen(false)}
                  className="rounded-none border-black/30 uppercase text-xs font-bold tracking-widest"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-none bg-black text-white hover:bg-black/80 uppercase text-xs font-bold tracking-widest"
                >
                  {isSaving ? "Saving..." : editingProduct ? "Save Changes" : "Add Product"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ── ORDER DETAIL SHEET ── */}
      <Sheet open={!!selectedOrder} onOpenChange={open => { if (!open) setSelectedOrder(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0 rounded-none border-l border-black/10 overflow-y-auto">
          {selectedOrder && (
            <>
              {/* Header */}
              <div className="bg-black text-white px-6 py-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-white/50 text-xs uppercase tracking-widest mb-1">Order Detail</p>
                  <h2 className="text-xl font-black tracking-tighter">{selectedOrder.orderId}</h2>
                  <p className="text-white/60 text-xs mt-1">
                    {new Date(selectedOrder.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <span className={`text-xs font-bold uppercase px-2 py-1 mt-1 shrink-0 ${statusColor(selectedOrder.status)}`}>
                  {statusLabel(selectedOrder.status)}
                </span>
              </div>

              <div className="px-6 py-5 space-y-6">
                {/* Customer Info */}
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Customer</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="font-bold text-sm">{selectedOrder.fullName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="text-sm text-gray-700">{selectedOrder.phone}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700 leading-snug">
                        {selectedOrder.address}<br />
                        {selectedOrder.city}, {selectedOrder.state} — {selectedOrder.pincode}
                      </span>
                    </div>
                  </div>
                </div>

                {/* WhatsApp Button */}
                <button
                  onClick={() => {
                    const itemsList = selectedOrder.items.map(item =>
                      `${item.quantity}x ${item.productName}${item.size ? ` (${item.size})` : ""}${item.color ? ` / ${item.color}` : ""}`
                    ).join("\n");
                    const msg = `Hi! Following up on order #${selectedOrder.orderId}\nItems:\n${itemsList}\nTotal: ${formatCurrency(selectedOrder.totalAmount)}\nCustomer: ${selectedOrder.fullName}, ${selectedOrder.phone}\nAddress: ${selectedOrder.address}, ${selectedOrder.city}, ${selectedOrder.state} - ${selectedOrder.pincode}`;
                    window.open(`https://wa.me/${selectedOrder.phone.replace(/\D/g, "").length === 10 ? "91" + selectedOrder.phone.replace(/\D/g, "") : selectedOrder.phone.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`, "_blank");
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold text-sm uppercase tracking-wider py-3 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp Customer
                </button>

                {/* Items */}
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">
                    Items ({selectedOrder.items.length})
                  </p>
                  <div className="space-y-3">
                    {selectedOrder.items.map((item, i) => (
                      <div key={i} className="flex gap-3 p-3 border border-black/10 bg-gray-50">
                        <img
                          src={item.productImage || `https://picsum.photos/seed/cap${item.productId}/200/200`}
                          alt={item.productName}
                          className="w-14 h-14 object-cover shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm leading-tight">{item.productName}</p>
                          <div className="text-xs text-gray-500 mt-0.5 space-x-2">
                            {item.size && <span>Size: {item.size}</span>}
                            {item.color && <span>Color: {item.color}</span>}
                            <span>Qty: {item.quantity}</span>
                          </div>
                        </div>
                        <p className="font-black text-sm shrink-0">{formatCurrency(item.price * item.quantity)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total */}
                <div className="border-t border-black pt-4 flex justify-between items-center">
                  <span className="font-black uppercase tracking-wider text-sm">Total</span>
                  <span className="font-black text-2xl tracking-tighter">{formatCurrency(selectedOrder.totalAmount)}</span>
                </div>

                {/* Status Update */}
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Update Status</p>
                  <div className="grid grid-cols-1 gap-2">
                    {(["pending_payment", "payment_verified", "shipped", "delivered", "cancelled"] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => {
                          handleOrderStatusChange(selectedOrder.id, s);
                          setSelectedOrder({ ...selectedOrder, status: s });
                        }}
                        disabled={selectedOrder.status === s || updateStatus.isPending}
                        className={`flex items-center justify-between px-4 py-2.5 text-xs font-bold uppercase tracking-wider border transition-colors ${
                          selectedOrder.status === s
                            ? "bg-black text-white border-black cursor-default"
                            : "bg-white text-black border-black/20 hover:border-black hover:bg-black/5"
                        }`}
                      >
                        <span>{statusLabel(s)}</span>
                        {selectedOrder.status === s && <span className="text-white/60">Current</span>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                {selectedOrder.notes && (
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Notes</p>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 border border-black/10">{selectedOrder.notes}</p>
                  </div>
                )}

                {/* Copy Order ID */}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedOrder.orderId);
                    toast({ title: "Order ID copied" });
                  }}
                  className="w-full flex items-center justify-center gap-2 border border-black/20 hover:border-black text-xs font-bold uppercase tracking-widest py-2.5 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy Order ID
                </button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── DELETE CONFIRM ── */}
      <AlertDialog open={deleteProductId !== null} onOpenChange={open => { if (!open) setDeleteProductId(null); }}>
        <AlertDialogContent className="rounded-none border-black">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black uppercase tracking-wider">Delete Product?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the product from your store. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none border-black/30 uppercase text-xs font-bold tracking-widest">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProduct}
              className="rounded-none bg-red-600 hover:bg-red-700 text-white uppercase text-xs font-bold tracking-widest"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
