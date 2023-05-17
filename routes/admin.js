const express = require("express");
const adminController = require("../controllers/adminController");
const router = express.Router();
const multer = require("../utils/multer");

router.get("/", adminController.checkLoggedIn, adminController.adminHome);
router.get("/login", adminController.ifLogged, adminController.adminLogin);
router.post("/", adminController.adminLoginPost);
router.get(
  "/logout",
  adminController.checkLoggedIn,
  adminController.adminLogout
);

//Product--
router.get(
  "/product",
  adminController.checkLoggedIn,
  adminController.adminProduct
);
router.get(
  "/getProdCategoryToAddProduct",
  adminController.checkLoggedIn,
  adminController.getProdCategoryToAddProduct
);
router.post(
  "/addProduct",
  adminController.checkLoggedIn,
  multer.array("image"),
  adminController.addProduct
);
router.get(
  "/editProductPage/:id",
  adminController.checkLoggedIn,
  adminController.editProductGet
);
router.post(
  "/editProduct/:id",
  adminController.checkLoggedIn,
  multer.array("image"),
  adminController.editProduct
);
router.post(
  "/searchProduct",
  adminController.checkLoggedIn,
  adminController.searchProduct
);
router.get(
  "/deleteProduct/:id",
  adminController.checkLoggedIn,
  adminController.deleteProduct
);
router.post(
  "/deleteSelectedImg",
  adminController.checkLoggedIn,
  adminController.deleteSelectedImg
);

//product category--
router.post(
  "/addProductCategory",
  adminController.checkLoggedIn,
  adminController.addProductCategory
);
router.get(
  "/deleteProductCategory/:id",
  adminController.checkLoggedIn,
  adminController.deleteProductCategory
);
router.get(
  '/listCategory/:id',
  adminController.checkLoggedIn,
  adminController.listCategory
)

//order
router.get("/order", adminController.checkLoggedIn, adminController.orderPage);
router.post(
  "/changeOrderStatus/:id",
  adminController.checkLoggedIn,
  adminController.changeOrderStatus
);
router.post("/refund", adminController.checkLoggedIn, adminController.refund);
router.post(
  "/searchOrder",
  adminController.checkLoggedIn,
  adminController.searchOrder
);
router.get('/orderDetails/:id',adminController.checkLoggedIn,adminController.orderDetails)

//Users--
router.get(
  "/accounts",
  adminController.checkLoggedIn,
  adminController.accounts
);
router.get(
  "/deleteUser/:id",
  adminController.checkLoggedIn,
  adminController.deleteUser
);
router.post("/addUser", adminController.checkLoggedIn, adminController.addUser);
router.post(
  "/editUser/:id",
  adminController.checkLoggedIn,
  adminController.editUser
);
router.post(
  "/searchUser",
  adminController.checkLoggedIn,
  adminController.searchUser
);
router.get(
  "/Block/:id",
  adminController.checkLoggedIn,
  adminController.blockUser
);
router.get('/sales-report',adminController.checkLoggedIn,adminController.salesReportPage)
router.post('/salesReportFilter',adminController.checkLoggedIn,adminController.salesReportFilter)

//coupons
router.get('/coupons',adminController.checkLoggedIn,adminController.couponsPage)
router.get('/addCoupon',adminController.checkLoggedIn,adminController.addCouponPage)
router.post('/addCoupon',adminController.checkLoggedIn,adminController.addCoupon)
router.post('/editCouponPost/:id', adminController.checkLoggedIn, adminController.editCouponPost);
router.get('/deactivate/:id', adminController.checkLoggedIn, adminController.deactivateCoupon);
router.get('/activate/:id', adminController.checkLoggedIn, adminController.activateCoupon);


//Banner
router.get('/banner',adminController.checkLoggedIn,adminController.bannerPage)
router.post('/addBanner',adminController.checkLoggedIn,multer.single('image',1),adminController.addBanner)
router.post('/editBanner/:id',adminController.checkLoggedIn,multer.single('image'),adminController.editBanner)
router.get('/selectBanner/:id', adminController.checkLoggedIn, adminController.selectBanner);



module.exports = router;
