import {
  validateRequiredFields,
  validateString,
  asyncHandler,
  blockchainRateLimiter,
} from "../middlewares/index.js";

const router = express.Router();

router.post(
  "/farms/register",
  blockchainRateLimiter,
  validateRequiredFields([
    "farmerId",
    "fullName",
    "harvestDate",
    "location",
  ]),
  validateString("farmerId", { minLength: 3, maxLength: 50 }),
  validateString("productType", { minLength: 2, maxLength: 30 }),
  validateString("location", { minLength: 5, maxLength: 100 }),
  asyncHandler(storeAgriDataController)
);
