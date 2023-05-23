const userHelper = require("../helpers/userHelper");
const productHelpers = require("../helpers/productHelpers");
const cartHelper = require("../helpers/cartHelper");

// twilio-config

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const serviceSID = process.env.TWILIO_SERVICE_SID;
const client = require("twilio")(accountSid, authToken);

const cloudinary = require("../utils/cloudinary");
const adminHelper = require("../helpers/adminHelper");
const objectId = require("mongodb-legacy").ObjectId;

const paypal = require('paypal-rest-sdk')

// paypal_creds

const paypal_client_id = process.env.PAYPAL_CLIENT_ID;
const paypal_client_secret = process.env.PAYPAL_CLIENT_SECRET;

paypal.configure({
  'mode': 'sandbox', //sandbox or live
  'client_id': paypal_client_id,
  'client_secret': paypal_client_secret
});


module.exports = {
  checkLoggedIn: (req, res, next) => {
    if (req.session.user) {
      next();
    } else {
      res.redirect("/");
    }
  },
  ifLogged: (req, res, next) => {
    if (req.session.user) {
      res.redirect("/");
    } else {
      next();
    }
  },
  userHome: async (req, res) => {
    const Banner = await userHelper.getActiveBanner();
    let productData = await productHelpers.getAllProducts()
    let BestSeller = productData.slice(0, 6);
    let BestProducts = productData.slice(Math.max(productData.length - 6, 0));
    if (req.session.user) {
      res.render("user/index", { user: req.session.user, userName: req.session.userName, BestSeller, BestProducts, Banner });
    } else {
      res.render("user/index", { BestSeller, BestProducts, Banner });
    }
  },

  //user Login

  userLogin: (req, res) => {
    res.render("user/login");
  },
  userLoginPost: (req, res) => {
    userHelper.doLogin(req.body).then((response) => {
      if (response.status == "Invalid User") {
        res.render("user/login", { emailErr: response.status });
      } else if (response.status == "Invalid Password") {
        res.render("user/login", { passErr: response.status });
      } else if (response.status == "User Blocked") {
        res.render("user/login", { passErr: response.status });
      } else {
        req.session.user = response.user;
        req.session.userName = response.user.name;
        res.redirect("/");
      }
    });
  },
  otpLoginPage: (req, res) => {
    res.render("user/loginOtp");
  },
  otpLoginPagePost: (req, res) => {
    userHelper.verifyMobile(req.body.mobile).then((response) => {
      if (response == "No user found") {
        res.render("user/loginOtp", { errMsg: "User Not Exist" });
      } else if (response == "User Blocked") {
        res.render("user/loginOtp", { errMsg: "User Blocked" });
      } else if (response == "user Exist") {

        //otp send

        client.verify.v2
          .services(serviceSID)
          .verifications.create({ to: "+91" + req.body.mobile, channel: "sms" })
          .then(() => {
            req.session.userDetails = req.body;
            res.redirect("/otpPages");
          });
      }
    });
  },
  otpVarificationLogin: (req, res) => {
    const userOtp = req.body.otp;

    const mobile = req.session.userDetails.mobile;

    // otp verify

    client.verify.v2
      .services(serviceSID)
      .verificationChecks.create({ to: "+91" + mobile, code: userOtp })
      .then(async (verification_check) => {
        if (verification_check.status === "approved") {

          // If the OTP is approved,Call the userSignup method to create the user

          await userHelper.findUserWithMob(mobile).then((response) => {
            req.session.user = response;
            req.session.userName = response.name;
            res.redirect("/");
          });
        } else {

          // If the OTP is not approved, render the OTP verification page with an error message

          res.render("user/otpLogin", { errMsg: "Invalid OTP" });
        }
      })
      .catch((error) => {
        console.log(error);

        // Render the OTP verification page with an error message

        res.render("user/otpLogin", {
          errMsg: "Something went wrong. Please try again.",
        });
      });
  },

  //user signup with otp

  userSignup: (req, res) => {
    res.render("user/signup");
  },
  userSignupPost: (req, res) => {

    // Check if the password and rePassword fields match

    if (req.body.password !== req.body.rePassword) {
      res.render("user/signup", { errMsg: "Password does not match" });
      return;
    }

    // Remove the rePassword field from the request body

    delete req.body.rePassword;

    // Validate the password using regular expressions

    const passwordRegex =
      /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*]).{8,}$/;
    if (!passwordRegex.test(req.body.password)) {
      res.render("user/signup", {
        errMsg:
          "Password must contain 8 characters, uppercase, lowercase, number, and special(!@#$%^&*)",
      });
      return;
    }

    // Validate the mobile number using regular expressions

    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(req.body.mobile)) {
      res.render("user/signup", {
        errMsg: "Mobile number should be 10 digit number",
      });
      return;
    }
    mob = req.body.mobile;
    userHelper.verifyMobile(mob).then((response) => {
      if (response == "Mobile Number already exist !") {
        res.render("user/signup", { errMsg: response });
      } else {

        // otp send

        client.verify.v2
          .services(serviceSID)
          .verifications.create({ to: "+91" + mob, channel: "sms" })
          .then(() => {
            req.session.userDetails = req.body;
            res.redirect("/otpVerificaion");
          });
      }
    });
  },
  otpVerificaionPage: (req, res) => {
    res.render("user/otp");
  },
  otpVerificaionSignup: (req, res) => {
    const userOtp = req.body.otp;
    const mobile = req.session.userDetails.mobile;

    // otp verify

    client.verify.v2
      .services(serviceSID)
      .verificationChecks.create({ to: "+91" + mobile, code: userOtp })
      .then((verification_check) => {
        if (verification_check.status === "approved") {

          // If the OTP is approved,Call the userSignup method to create the user

          userHelper
            .userSignup(req.session.userDetails)
            .then((response) => {
              if (response == "Email already exist !") {
                req.session.errMsg = response;
                res.render("user/signup", { errMsg: req.session.errMsg });
              } else {
                res.redirect("/");
              }
            })
            .catch((err) => {
              console.log(err);
            });
        } else {

          // If the OTP is not approved, render the OTP verification page with an error message

          res.render("user/otp", { errMsg: "Invalid OTP" });
        }
      })
      .catch((error) => {
        console.log(error);

        // Render the OTP verification page with an error message

        res.render("user/otp", {
          errMsg: "Something went wrong. Please try again.",
        });
      });
  },

  //forgot password

  forgotPassword: (req, res) => {
    res.render("user/forgotPass");
  },
  forgotPasswordPost: (req, res) => {

    // Check if the password and rePassword fields match

    if (req.body.password !== req.body.rePassword) {
      res.render("user/forgotPass", { errMsg: "Password does not match" });
      return;
    }

    // Remove the rePassword field from the request body

    delete req.body.rePassword;

    // Validate the password using regular expressions

    const passwordRegex =
      /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*]).{8,}$/;
    if (!passwordRegex.test(req.body.password)) {
      res.render("user/forgotPass", {
        errMsg:
          "Password must contain 8 characters, uppercase, lowercase, number, and special(!@#$%^&*)",
      });
      return;
    }

    userHelper.checkuserBlockExist(req.body.email).then((response) => {
      if (response.status == "No user Found") {
        res.render("user/forgotPass", { errMsg: response.status });
      } else if (response.status == "User Blocked") {
        res.render("user/forgotPass", { errMsg: response.status });
      } else {
        // otp send
        client.verify.v2
          .services(serviceSID)
          .verifications.create({ to: "+91" + response.mob, channel: "sms" })
          .then(() => {
            req.session.mob = response.mob;
            req.session.userDetails = req.body;
            res.render("user/forgotPassOtp");
          });
      }
    });
  },
  forgotPassOtpVerificaion: (req, res) => {
    const userOtp = req.body.otp;
    const mobile = req.session.mob;
    console.log(userOtp, mobile, req.session.userDetails);

    // otp verify

    client.verify.v2
      .services(serviceSID)
      .verificationChecks.create({ to: "+91" + mobile, code: userOtp })
      .then((verification_check) => {
        if (verification_check.status === "approved") {

          // If the OTP is approved,Call the userSignup method to create the user

          userHelper
            .forgotPassUpdatePass(req.session.userDetails)
            .then(() => {
              res.redirect("/login");
            })
            .catch((err) => {
              console.log(err);
            });
        } else {

          // If the OTP is not approved, render the OTP verification page with an error message

          res.render("user/forgotPassOtp", { errMsg: "Invalid OTP" });
        }
      })
      .catch((error) => {

        // Render the OTP verification page with an error message

        res.render("user/forgotPassOtp", {
          errMsg: "Something went wrong. Please try again.",
        });
      });
  },

  //user

  //contact

  contactPage: (req, res) => {
    res.render("user/contact", {
      user: req.session.user,
      userName: req.session.userName,
    });
  },

  //product

  productPage: async (req, res) => {
    const totalPages = await productHelpers.totalPages()
    const currentPage = req.query.page || 1;

    if (req.session.filteredProducts) {
      await productHelpers.getProductCategory().then((category) => {
        res.render("user/product", {
          user: req.session.user,
          userName: req.session.userName,
          category,
          currentPage,
          totalPages,
          productData: req.session.filteredProducts,
        });
      });
    } else {
      await productHelpers.getProducts(currentPage).then(async (productData) => {
        await productHelpers.getProductCategory().then((category) => {
          res.render("user/product", {
            user: req.session.user,
            userName: req.session.userName,
            category,
            currentPage,
            totalPages,
            productData,
          });
        });
      });
    }
  },
  productPageCategorized: async (req, res) => {
    const category = req.params.category;
    const currentPage = req.query.page || 1;
    const totalPages = await productHelpers.totalCategoryPages(category)
    try {
      productHelpers.productCategorized(category, currentPage).then(async (productData) => {
        await productHelpers.getProductCategory().then((category) => {
          res.render("user/product", {
            user: req.session.user,
            userName: req.session.userName,
            category,
            productData,
            currentPage,
            totalPages,
          });
        });
      });
    } catch (err) {
      res.redirect("back");
    }
  },
  productDetailePage: async (req, res) => {
    const productId = req.params.id;
    await productHelpers
      .getSingleProductDetaile(productId)
      .then(async (productData) => {
        await productHelpers
          .relatedProduct(productData[0].category)
          .then((relatedProducts) => {
            res.render("user/productDetail", {
              user: req.session.user,
              userName: req.session.userName,
              productData,
              relatedProducts,
            });
          });
      });
  },
  filterPrice: (req, res) => {
    productHelpers
      .filterPrice(req.body.minPrice, req.body.maxPrice)
      .then((product) => {
        req.session.filteredProducts = product;
        res.json({
          status: "success",
        });
      });
  },
  sortPrice: (req, res) => {
    productHelpers.sortPrice(req.body).then((products) => {
      req.session.filteredProducts = products;
      res.json({
        status: "success",
      });
    });
  },
  searchProduct:(req,res)=>{

    productHelpers.searchProduct(req.body.search).then((product)=>{
      req.session.filteredProducts=product
      res.json({
        status:"succcess"
      })
    })
  },

  //cart

  cartPage: (req, res) => {
    cartHelper.getCartDetails(req.session.user._id).then(async (cartData) => {
      if (!cartData.length == 0) {
        await cartHelper.getCartTotal(req.session.user._id).then((total) => {
          res.render("user/cart", {
            user: req.session.user,
            userName: req.session.userName,
            CartData: cartData,
            total: total,
          });
        });
      } else {
        res.render("user/cart", {
          user: req.session.user,
          userName: req.session.userName,
          CartData: [],
          total: null,
        });
      }
    });
  },
  addToCart: (req, res) => {
    const productId = req.params.id;
    const quantity = 1;
    cartHelper.addToCart(productId, req.session.user._id, quantity).then(() => {
      res.json({
        status: "successs",
        message: "added to cart",
      });
    });
  },
  deleteCartItem: (req, res) => {
    const productId = req.params.id;
    cartHelper.deleteCartItem(productId, req.session.user._id).then(() => {
      res.redirect("back");
    });
  },
  changeProductQuantity: (req, res, next) => {
    cartHelper
      .changeProductQuantity(req.session.user._id, req.body)
      .then(async (response) => {
        if (!response.removeProduct) {
          response.total = await cartHelper.getCartTotal(req.session.user._id);
          res.json(response);
        } else {
          res.json(response);
        }
      });
  },

  //wishlist

  wishlistPage: (req, res) => {
    userHelper.getWishlist(req.session.user._id).then((response) => {
      res.render("user/wishlist", {
        user: req.session.user,
        userName: req.session.userName,
        data: response,
      });
    });
  },
  addToWishlist: async (req, res) => {
    const productId = req.params.id;
    await userHelper.addToWishlist(productId, req.session.user._id).then(() => {
      res.json({
        status: "successs",
        message: "added to Wishlist",
      });
    });
  },
  deleteWishlist: (req, res) => {
    const productId = req.params.id;
    userHelper.deleteWishlist(productId, req.session.user._id).then(() => {
      res.redirect("back");
    });
  },

  //orders

  orderPage: (req, res) => {
    userHelper.getOrderDetails(req.session.user._id).then((data) => {
      res.render("user/orders", {
        user: req.session.user,
        userName: req.session.userName,
        data,
      });
    });
  },
  orderDetail: (req, res) => {
    const orderId = req.params.id;
    userHelper.getSingleOrderDetail(orderId).then((data) => {
      res.render("user/orderDetail", {
        user: req.session.user,
        userName: req.session.userName,
        data,
      });
    });
  },
  cancelOrder: (req, res) => {
    const orderId = req.params.id;
    const reason = req.body.reason
    userHelper.cancelOrder(orderId, reason).then(() => {
      res.redirect("back");
    });
  },
  returnOrder: (req, res) => {
    const orderId = req.params.id;
    const reason = req.body.reason
    userHelper.returnOrder(orderId, reason).then(() => {
      res.redirect("back");
    });
  },
  failurePage: (req, res) => {
    res.render('user/failure', { user: req.session.user, userName: req.session.user });
  },
  orderSubmited: async (req, res) => {

    const now = new Date();
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const addressId = req.body.address;
    const total = req.body.total;
    const paymentMethod = req.body.paymentMethod;
    const status = req.body.paymentMethod === 'COD' ? 'Placed' : 'Pending'
    const shippingAddress = await userHelper.getAddressDetails(
      req.session.user._id,
      addressId
    );
    const cartItems = await cartHelper.getCartDetails(req.session.user._id);
    const order = {
      userId: new objectId(req.session.user._id),
      userName: req.session.user.name,
      item: cartItems,
      shippingAddress: shippingAddress,
      total: total,
      paymentMethod: paymentMethod,
      date: date,
      status: status,
      coupon: req.body.coupon
    };
    const userId = req.session.user._id
    userHelper.addOrderDetails(order, userId).then(async (response) => {
      let orderId = String(response.insertedId)
      req.session.orderId = orderId
      if (req.body['paymentMethod'] == 'COD') {
        await cartHelper.removeCartOfUser(req.session.user._id);
        res.json({
          status: true,
          paymentMethod: req.body.paymentMethod
        });
      } else if (req.body['paymentMethod'] == 'onlineRazorpay') {
        await cartHelper.removeCartOfUser(req.session.user._id);
        userHelper.generateRazorpay(orderId, total).then((response) => {
          const userDetails = req.session.user;
          res.json({
            response: response,
            paymentMethod: "onlineRazorpay",
            userDetails: userDetails
          })
        })
          .catch((err) => {
            console.log(err);
          })
      } else {
        const create_payment_json = {
          intent: "sale",
          payer: {
            payment_method: "paypal",
          },
          redirect_urls: {
            return_url: "http://www.flagship-phones.store/success",
            cancel_url: "http://www.flagship-phones.store/failure",
          },
          transactions: [
            {
              amount: {
                currency: "USD",
                total: total,
              },
              description: "Flag-Ship Phones PAYPAL PAYMENT",
            },
          ],
        };
        paypal.payment.create(create_payment_json, function (error, payment) {

          if (error) {
            console.log(error);
            res.render('user/failure', { user: req.session.user, userName: req.session.user.name });
          } else {
            try {
              userHelper.changeOrderStatus(orderId).then(() => { console.log("changed") }).catch(() => { });
              cartHelper.removeCartOfUser(req.session.user._id);
            } catch (err) {
              console.log(err);
            } finally {
              for (let i = 0; i < payment.links.length; i++) {
                if (payment.links[i].rel === "approval_url") {
                  res.json({
                    approval_link: payment.links[i].href,
                    status: "success"
                  })
                }
              }
            }
          }
        });
      }

    });
  },
  paypalSuccess: (req, res) => {
    const payerId = req.query.PayerID;
    const paymentId = req.query.paymentId;
    const execute_payment_json = {
      payer_id: payerId,
      transactions: [
        {
          amount: {
            currency: "USD",
            total: "25.00",
          },
        },
      ],
    };
    paypal.payment.execute(paymentId, execute_payment_json, (error, payment) => {
      const userName = req.session.user.name;
      if (error) {
        userHelper.changeOrderStatusFailed(req.session.orderId)
        res.render('user/failure', { user: req.session.user, userName });
      } else {
        res.render('user/success', { user: req.session.user, payerId, paymentId, userName });
      }
    }
    );
  },
  verifyPayment: (req, res) => {
    userHelper.verifyPayment(req.body).then(() => {
      userHelper.changeOrderStatus(req.body.order.receipt).then(() => {
        res.json({
          status: true
        });
      })
    })
  },

  //checkout

  checkoutPage: (req, res) => {
    userHelper.findUser(req.session.user._id).then(async (userAddress) => {
      total = await cartHelper.getCartTotal(req.session.user._id);
      res.render("user/checkoutPage", {
        user: req.session.user,
        userName: req.session.userName,
        userDetails: userAddress,
        total,
      });
    });
  },

  //profile
  profilePage: (req, res) => {
    userHelper.findUser(req.session.user._id).then((response) => {
      res.render("user/profile", {
        user: req.session.user,
        userName: req.session.userName,
        userDetails: response,
      });
    });
  },
  editUser: (req, res) => {
    const userId = req.session.user._id;
    userHelper.editUser(userId, req.body).then(async () => {
      try {
        if (req.file) {
          const result = await cloudinary.uploader.upload(req.file.path);
          imgUrls = result.url;
          userHelper
            .editUserPic(userId, imgUrls)
            .then(() => { })
            .catch(() => { });
        }
      } catch (err) {
        console.log(`error : ${err}`);
      } finally {
        userHelper.findUser(userId).then((response) => {
          res.render("user/profile", {
            user: req.session.user,
            userName: req.session.userName,
            userDetails: response,
          });
        });
      }
    });
  },
  blockUser: (req, res) => {
    userId = req.params.id;
    adminHelper.blockUser(userId).then(() => {
      req.session.user = null;
      res.redirect("back");
    });
  },

  //address

  manageAddress: (req, res) => {
    userHelper.findUser(req.session.user._id).then((response) => {
      res.render("user/manageAddress", {
        user: req.session.user,
        userName: req.session.userName,
        userDetails: response,
      });
    });
  },
  addAddressPost: (req, res) => {
    userHelper
      .addAddressPost(req.body, req.session.user._id)
      .then(() => {
        res.redirect("back");
      })
      .catch(() => {
        res.redirect("back");
      });
  },
  editAddressPost: (req, res) => {
    const addressId = req.params.id;
    userHelper
      .editAddressPost(req.body, req.session.user._id, addressId)
      .then(() => {
        res.redirect("back");
      })
      .catch(() => {
        res.redirect("back");
      });
  },
  deleteAddress: (req, res) => {
    const addressId = req.params.id;
    userHelper
      .deleteAddress(addressId, req.session.user._id)
      .then(() => {
        res.redirect("back");
      })
      .catch(() => {
        res.redirect("back");
      });
  },


  //wallet
  
  walletPage: (req, res) => {
    userHelper.getWalletPage(req.session.user._id).then((wallet) => {
      res.render('user/wallet', { wallet, userName: req.session.userName, user: req.session.user })
    })
  },
  walletTablePage: (req, res) => {
    userHelper.getWalletPage(req.session.user._id).then((wallet) => {
      res.render('user/walletTable', { wallet: wallet, userName: req.session.userName, user: req.session.user })
    })
  },

  //coupon

  couponApply: (req, res) => {
    const userId = req.session.user._id
    userHelper.couponApply(req.body.couponCode, userId)
      .then((coupon) => {
        if (coupon) {
          if (coupon === 'couponExists') {
            res.json({
              status: 'Coupon is already used, try another coupon'
            })
          } else {
            res.json({
              status: 'success',
              coupon: coupon
            })
          }
        } else {
          res.json({
            status: 'Coupon not valid!'
          })
        }
      })
  },
  userLogout: (req, res) => {
    req.session.user = null;
    req.session.userName = null;
    // req.session.destroy();
    res.redirect("/");
  },
};
