import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import ordersRouter from "./orders";
import adminRouter from "./admin";
import paymentsRouter from "./payments";
import pushRouter from "./push";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/products", productsRouter);
router.use("/orders", ordersRouter);
router.use("/admin", adminRouter);
router.use("/payments", paymentsRouter);
router.use("/push", pushRouter);

export default router;
