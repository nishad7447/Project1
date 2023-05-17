const { response } = require("express");
const adminHelper = require("../helpers/adminHelper");
const userHelper = require("../helpers/userHelper");
const productHelpers = require("../helpers/productHelpers");
const cloudinary = require("../utils/cloudinary");

module.exports = {
  ifLogged: (req, res, next) => {
    if (req.session.adminUser) {
      res.redirect("/admin");
    } else {
      next();
    }
  },
  checkLoggedIn: (req, res, next) => {
    if (req.session.adminUser) {
      next();
    } else {
      res.redirect("/admin/login");
    }
  },
  adminHome: async (req, res) => {
    const userCount = await adminHelper.getUsersCount()
    const total = await adminHelper.getLastMonthTotal()
    const totalOrdersPlaced = await productHelpers.totalOrdersPlaced()
    let totalEarnings = 0;
    totalEarnings = await adminHelper.getOrderTotalPrice()
    const jan = await adminHelper.getMonthCount(1, 2023)
    const feb = await adminHelper.getMonthCount(2, 2023)
    const mar = await adminHelper.getMonthCount(3, 2023)
    const apr = await adminHelper.getMonthCount(4, 2023)
    const may = await adminHelper.getMonthCount(5, 2023)
    const jun = await adminHelper.getMonthCount(6, 2023)
    const Refunded = await adminHelper.getOrderStatus('Refunded')
    const Delivered = await adminHelper.getOrderStatus('Delivered')
    const Pending = await adminHelper.getOrderStatus('Pending')
    const Returned = await adminHelper.getOrderStatus('Returned')
    const Cancelled = await adminHelper.getOrderStatus('Cancelled')
    const Shipped = await adminHelper.getOrderStatus('Shipped')
    const Placed = await adminHelper.getOrderStatus('Placed')
    res.render("admin/index", {
      user: req.session.adminUser, userName: req.session.adminUserName,
      userCount,
      total,
      totalOrdersPlaced,
      totalEarnings,
      jan,
      feb,
      mar,
      apr,
      may,
      jun,
      Refunded,
      Delivered,
      Pending,
      Returned,
      Cancelled,
      Shipped,
      Placed
    });
  },
  adminLogin: (req, res) => {
    res.render("admin/login");
  },
  adminLoginPost: (req, res) => {
    adminHelper.doLogin(req.body).then((response) => {
      if (response.status == "Invalid User") {
        res.render("admin/login", { emailErr: response.status });
      } else if (response.status == "Invalid Password") {
        res.render("admin/login", { passErr: response.status });
      } else {
        req.session.adminUser = response.user;
        req.session.adminUserName = response.user.name;
        res.redirect("/admin");
      }
    });
  },

  //Product

  adminProduct: async (req, res) => {
    await adminHelper
      .getProducts()
      .then(async (productData) => {
        await productHelpers.getProductCategory().then((category) => {
          res.render("admin/product", {
            userName: req.session.adminUserName,
            category,
            productData,
          });
        });
      })
      .catch((err) => {
        console.log(err);
      });
  },
  getProdCategoryToAddProduct: (req, res) => {
    productHelpers.getProductCategory().then((category) => {
      res.render("admin/addProduct", {
        userName: req.session.adminUserName,
        category,
      });
    });
  },
  addProduct: async (req, res) => {
    const categoryId = await productHelpers.getCategoryId(req.body.category);
    const data = {
      name: req.body.name,
      description: req.body.description,
      category: req.body.category,
      categoryId: categoryId._id,
      stock: req.body.stock,
      price: req.body.price,
    };
    productHelpers.addProducts(data).then(async (id) => {
      const imgUrls = [];
      try {
        for (let i = 0; i < req.files.length; i++) {
          const result = await cloudinary.uploader.upload(req.files[i].path);
          imgUrls.push(result.url);
        }
        productHelpers
          .addProductImage(id, imgUrls)
          .then(() => { })
          .catch(() => { });
      } catch (err) {
        console.log(`error : ${err}`);
      } finally {
        res.redirect("/admin/product");
      }
    });
  },
  editProductGet: (req, res) => {
    const productId = req.params.id;
    productHelpers.getSingleProductDetaile(productId).then((productData) => {
      productHelpers.getProductCategory().then((category) => {
        res.render("admin/editProduct", {
          userName: req.session.adminUserName,
          category,
          productData,
        });
      });
    });
  },
  editProduct: async (req, res) => {
    const productId = req.params.id;
    const categoryId = await productHelpers.getCategoryId(req.body.category);
    const data = {
      name: req.body.name,
      description: req.body.description,
      category: req.body.category,
      categoryId: categoryId._id,
      stock: req.body.stock,
      price: req.body.price,
    };
    productHelpers.editProduct(productId, data).then(async () => {
      const imgUrls = [];
      try {
        for (let i = 0; i < req.files.length; i++) {
          const result = await cloudinary.uploader.upload(req.files[i].path);
          imgUrls.push(result.url);
        }
        if (imgUrls.length > 0) {
          productHelpers
            .editProductImage(productId, imgUrls)
            .then(() => { })
            .catch(() => { });
        }
      } catch (err) {
        console.log(`error : ${err}`);
      } finally {
        res.redirect("/admin/product");
      }
    });
  },
  searchProduct: (req, res) => {
    productHelpers
      .searchProduct(req.body.name)
      .then(async (product) => {
        await productHelpers.getProductCategory().then((category) => {
          res.render("admin/product", {
            userName: req.session.adminUserName,
            category,
            productData: product,
          });
        });
      })
      .catch(async (err) => {
        await productHelpers.getProductCategory().then((category) => {
          res.render("admin/product", {
            userName: req.session.adminUserName,
            category,
            errMsg: err,
          });
        });
      });
  },
  deleteProduct: (req, res) => {
    const productId = req.params.id;
    productHelpers
      .deleteProducts(productId)
      .then(() => {
        res.redirect("back");
      })
      .catch(() => {
        res.redirect("back");
      });
  },
  deleteSelectedImg: (req, res, next) => {
    const productId = req.body.productId;
    const imgUrl = req.body.imgUrl;
    const imgIndex = req.body.imgIndex;
    productHelpers
      .deleteSelectedImg(productId, imgUrl, imgIndex)
      .then((response) => {
        res.json(response);
      })
      .catch((err) => {
        console.log(err);
      });
  },

  //product category--

  addProductCategory: (req, res) => {
    const category = req.body.category.toUpperCase();
    productHelpers
      .addProductCategory(category)
      .then(() => {
        res.redirect("back");
      })
      .catch(async () => {
        await productHelpers.getProducts().then(async (productData) => {
          productHelpers.getProductCategory().then((category) => {
            res.render("admin/product", {
              userName: req.session.adminUserName,
              errMsg: "Category Exist",
              category,
              productData,
            });
          });
        });
      });
  },
  deleteProductCategory: (req, res) => {
    const cateId = req.params.id;
    productHelpers
      .deleteProductCategory(cateId)
      .then(() => {
        res.redirect("back");
      })
      .catch(() => {
        res.redirect("back");
      });
  },
  listCategory: (req, res) => {
    const cateId = req.params.id;
    productHelpers
      .listCategory(cateId)
      .then(() => {
        res.redirect("back");
      })
      .catch(() => {
        res.redirect("back");
      });
  },

  //User

  accounts: async (req, res) => {
    await adminHelper.getUser().then((response) => {
      res.render("admin/accounts", {
        userData: response,
        errMsg: req.session.errMsg,
        userName: req.session.adminUserName,
      });
    });
  },
  addUser: (req, res) => {

    // Check if the password and rePassword fields match

    if (req.body.password !== req.body.rePassword) {
      req.session.errMsg = "Password does not match";
      res.redirect("back");

      return;
    }

    // Remove the rePassword field from the request body

    delete req.body.rePassword;

    // Validate the password using regular expressions

    const passwordRegex =
      /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*]).{8,}$/;
    if (!passwordRegex.test(req.body.password)) {
      req.session.errMsg =
        "Password must contain 8 characters, uppercase, lowercase, number, and special(!@#$%^&*)";
      res.redirect("back");
      return;
    }

    // Call the userSignup method to create the user

    userHelper
      .userSignup(req.body)
      .then((response) => {
        if (response == "Email already exist !") {
          req.session.errMsg = response;
          res.redirect("back");
        } else {
          res.redirect("back");
        }
      })
      .catch((err) => {
        console.log(err);
      });
    req.session.errMsg = null;
  },
  editUser: (req, res) => {
    const userId = req.params.id;
    adminHelper
      .editUser(userId, req.body)
      .then(() => {
        if (response == "Email already exist !") {
          req.session.errMsg = response;
          res.redirect("back");
        } else {
          res.redirect("back");
        }
      })
      .catch(() => {
        res.redirect("back");
      });
  },
  searchUser: (req, res) => {
    adminHelper
      .searchUser(req.body.name)
      .then((userData) => {
        res.render("admin/accounts", { userData });
      })
      .catch((err) => {
        res.render("admin/accounts", { errMsg: err });
      });
  },
  deleteUser: (req, res) => {
    const userId = req.params.id;
    adminHelper
      .deleteUser(userId)
      .then((response) => {
        res.redirect("back");
      })
      .catch((err) => {
        res.redirect("back");
      });
  },
  blockUser: (req, res) => {
    userId = req.params.id;
    adminHelper.blockUser(userId).then(() => {
      res.redirect("/admin/accounts");
    });
  },

  //order

  orderPage: (req, res) => {
    adminHelper.getAllOrders().then((orders) => {
      res.render("admin/orders", {
        userName: req.session.adminUserName,
        orders,
      });
    });
  },
  changeOrderStatus: (req, res) => {
    const _id = req.params.id;
    const status = req.body.status;
    adminHelper.changeOrderStatus(_id, status).then(() => {
      res.redirect("back");
    });
  },
  refund: (req, res) => {
    adminHelper.refund(req.body).then(() => {
      res.json({
        status: "success",
      });
    });
  },
  orderDetails: (req, res) => {
    const orderId = req.params.id;
    userHelper.getSingleOrderDetail(orderId).then((data) => {
      res.render("admin/orderDetail", {
        userName: req.session.adminUserName,
        data,
      });
    });
  },
  searchOrder: (req, res) => {
    adminHelper.searchOrder(req.body.name).then((order) => {
      res.render("admin/orders", {
        userName: req.session.adminUserName,
        orders: order,
      });
    });
  },
  salesReportPage: async (req, res) => {
    let totalEarnings = 0;
    totalEarnings = await adminHelper.getOrderTotalPrice()
    let deliveredOrders = await adminHelper.getDeliveredOrders()
    deliveredOrders.forEach(eachOrder => {
      eachOrder.productCount = eachOrder.item.length;

      // date formatting

      const newDate = new Date(eachOrder.date);
      const year = newDate.getFullYear();
      const month = newDate.getMonth() + 1;
      const day = newDate.getDate();
      const formattedDate = `${day < 10 ? '0' + day : day}-${month < 10 ? '0' + month : month}-${year}`;
      eachOrder.date = formattedDate;
    })
    res.render('admin/salesReport', { totalEarnings, deliveredOrders })
  },
  salesReportFilter: (req, res) => {
    adminHelper.filterDate(req.body.date).then((filteredOrders) => {
      let totalEarnings = 0;
      if (filteredOrders.length >= 1) {
        filteredOrders.forEach(eachOrder => {
          eachOrder.productCount = eachOrder.item.length;
          totalEarnings += parseInt(eachOrder.total);

          // date formatting

          const newDate = new Date(eachOrder.date);
          const year = newDate.getFullYear();
          const month = newDate.getMonth() + 1;
          const day = newDate.getDate();
          const formattedDate = `${day < 10 ? '0' + day : day}-${month < 10 ? '0' + month : month}-${year}`;
          eachOrder.date = formattedDate;
        });
      } else {
        filteredOrders = false;
      }
      res.render('admin/salesReport', { deliveredOrders: filteredOrders, totalEarnings });
    })
  },


  //coupon

  couponsPage: async (req, res) => {
    const coupons = await adminHelper.getCoupons();
    coupons.forEach(coupon => {
      coupon.deactivated = coupon.status === "DEACTIVATED" ? true : false;
      coupon.expired = coupon.status === "EXPIRED" ? true : false;
    });
    res.render('admin/coupons', { userName: req.session.adminUserName, coupons })
  },
  addCouponPage: (req, res) => {
    res.render('admin/addCoupon', { userName: req.session.adminUserName, })
  },
  addCoupon: (req, res) => {
    adminHelper.addCoupon(req.body).then(() => {
      res.redirect('/admin/coupons');
    })
      .catch(() => {
        res.redirect('/admin/coupons');
      })
  },
  editCouponPost: (req, res) => {
    const couponId = req.params.id;
    adminHelper.editCoupon(couponId, req.body).then(() => {
      res.redirect('/admin/coupons');
    })
      .catch(() => {
        res.redirect('/admin/coupons');
      })
  },
  deactivateCoupon: (req, res) => {
    const couponId = req.params.id;
    adminHelper.deactivateCoupon(couponId).then(() => {
      res.redirect('/admin/coupons');
    })
      .catch(() => {
        res.redirect('/admin/coupons');
      })
  },
  activateCoupon: (req, res) => {
    const couponId = req.params.id;
    adminHelper.activateCoupon(couponId).then(() => {
      res.redirect('/admin/coupons');
    })
      .catch(() => {
        res.redirect('/admin/coupons');
      })
  },


  //banner
  
  bannerPage: (req, res) => {
    adminHelper.getBanners().then((banner) => {
      res.render('admin/banner', { banner, userName: req.session.adminUserName });
    })
  },
  addBanner: async (req, res) => {
    try {
      const result = await cloudinary.uploader.upload(req.file.path);
      req.body.image = result.url;
    } catch (err) {
      console.log(err);
    }
    adminHelper.addBanner(req.body).then(() => {
      res.redirect('/admin/banner');
    });
  },
  editBanner: async (req, res) => {
    const bannerId = req.params.id;
    try {
      const result = await cloudinary.uploader.upload(req.file.path);
      adminHelper.editImageUpload(bannerId, result.url);
    } catch (err) {
      console.log(err);
    }
    adminHelper.editBanner(bannerId, req.body).then(() => {
      res.redirect('/admin/banner');
    });
  },
  selectBanner: (req, res) => {
    const bannerId = req.params.id;
    adminHelper.selectBanner(bannerId).then(() => {
      res.redirect('/admin/banner');
    });
  },

  adminLogout: (req, res) => {
    req.session.adminUser = null;
    req.session.adminUserName = null;
    // req.session.destroy()
    res.redirect("/admin");
  },
};
