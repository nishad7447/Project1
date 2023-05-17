const express=require('express')
const userController = require('../controllers/userController')
const router=express.Router()
const multer=require('../utils/multer')


router.get('/',userController.userHome)
//signIn
router.get('/login',userController.ifLogged,userController.userLogin)
router.post('/',userController.userLoginPost)
router.get('/otpLoginPage',userController.otpLoginPage)
router.post('/otpLoginPagePost',userController.otpLoginPagePost)
router.get('/otpPages',(req,res)=>{res.render('user/otpLogin')})
router.post('/otpVarificationLogin',userController.otpVarificationLogin)

//forgot Password
router.get('/forgotPassword',userController.forgotPassword)
router.post('/forgotPassword',userController.forgotPasswordPost)
router.post('/forgotPassOtpVerificaion',userController.forgotPassOtpVerificaion)

//signUP
router.get('/signup',userController.userSignup)
router.post('/signup',userController.userSignupPost)
router.get('/otpVerificaion',userController.otpVerificaionPage)
router.post('/otpVerificaion',userController.otpVerificaionSignup)

//user

//contact
router.get('/contact',userController.checkLoggedIn,userController.contactPage)

//product
router.get('/product',userController.checkLoggedIn,userController.productPage)
router.get('/productCategorized/:category',userController.checkLoggedIn,userController.productPageCategorized)
router.get('/productDetail/:id',userController.productDetailePage)

//filter
router.post('/shopPriceFilter',userController.checkLoggedIn,userController.filterPrice)
//sort
router.post('/shopPriceSort',userController.checkLoggedIn,userController.sortPrice)
//search
router.post('/searchProduct',userController.checkLoggedIn,userController.searchProduct)


//cart
router.get('/cart',userController.checkLoggedIn,userController.cartPage)
router.get('/cart/:id',userController.checkLoggedIn,userController.addToCart)
router.get('/deleteCartItem/:id',userController.checkLoggedIn,userController.deleteCartItem)
router.post('/change-product-quantity',userController.changeProductQuantity)

//wishlist
router.get('/wishlist', userController.checkLoggedIn, userController.wishlistPage);
router.get('/wishlist/:id',userController.checkLoggedIn,userController.addToWishlist)
router.get('/deleteWishlist/:id',userController.checkLoggedIn,userController.deleteWishlist)


//profile
router.get('/profile',userController.checkLoggedIn,userController.profilePage)
router.post('/profile',userController.checkLoggedIn,multer.single('image'),userController.editUser)

//checkout
router.get('/checkout',userController.checkLoggedIn,userController.checkoutPage)

//orders
router.get('/order',userController.checkLoggedIn,userController.orderPage)
router.get('/orderDetail/:id',userController.checkLoggedIn,userController.orderDetail)
router.post('/cancelOrder/:id',userController.checkLoggedIn,userController.cancelOrder)
router.post('/returnOrder/:id',userController.checkLoggedIn,userController.returnOrder)

//orderSubmit
router.post('/orderSubmited',userController.checkLoggedIn,userController.orderSubmited)
router.post('/verifyPayment', userController.checkLoggedIn, userController.verifyPayment);
router.get('/success', userController.checkLoggedIn, userController.paypalSuccess);
router.get('/failure', userController.checkLoggedIn, userController.failurePage);




//address
router.get('/deactivateAcc/:id',userController.checkLoggedIn,userController.blockUser)
router.get('/manageAddress',userController.checkLoggedIn,userController.manageAddress)
router.post('/addAddressPost',userController.checkLoggedIn,userController.addAddressPost)
router.post('/editAddressPost/:id',userController.checkLoggedIn,userController.editAddressPost)
router.get('/deleteAddress/:id',userController.checkLoggedIn,userController.deleteAddress)


//wallet
router.get('/wallet',userController.checkLoggedIn,userController.walletPage)
router.get('/walletTable',userController.checkLoggedIn,userController.walletTablePage)


//coupon
router.post('/couponApply',userController.checkLoggedIn,userController.couponApply)

router.get('/logout',userController.checkLoggedIn,userController.userLogout)
module.exports=router  