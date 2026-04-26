import { Router, type IRouter } from "express";
import healthRouter from "./health";
import menuRouter from "./menu";
import ordersRouter from "./orders";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(menuRouter);
router.use(ordersRouter);
router.use(statsRouter);

export default router;
