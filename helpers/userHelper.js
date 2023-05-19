const db = require("../config/connection");
const collection = require("../config/collection");
const bcrypt = require("bcrypt");
const objectId = require('mongodb-legacy').ObjectId;
const Razorpay = require("razorpay");
const crypto = require('crypto');


var instance = new Razorpay({
  key_id: process.env.RAZORPAY_API_KEY,
  key_secret: process.env.RAZORPAY_API_SECRET
})

module.exports = {
  doLogin: (userData) => {
    return new Promise(async (resolve, reject) => {
      const response = {};
      const user = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ email: userData.email });
      if (user) {
        if (user.status === false) {
          response.status = "User Blocked";
          resolve(response);
        }
        bcrypt.compare(userData.password, user.password).then((status) => {
          if (status) {
            response.user = user;
            resolve(response);
          } else {
            response.status = "Invalid Password";
            resolve(response);
          }
        });
      } else {
        response.status = "Invalid User";
        resolve(response);
      }
    });
  },
  verifyMobile: (mob) => {
    return new Promise(async (resolve, reject) => {
      mobExist = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ mobile: mob })
      let response = {}
      if (mobExist) {
        if (mobExist.status === false) {
          response = "User Blocked";
          resolve(response);
        } else {
          response = 'user Exist'
          resolve(response)
        }
      } else {
        resolve('No user found')
      }
    })
  },
  userSignup: (userData) => {
    return new Promise(async (resolve, reject) => {
      const findUserDetail = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ email: userData.email });
      if (findUserDetail) {
        resolve("Email already exist !");
      } else {
        Object.assign(userData, { status: true });
        userData.password = await bcrypt.hash(userData.password, 10);
        db.get()
          .collection(collection.USER_COLLECTION)
          .insertOne(userData)
          .then(() => {
            resolve();
          })
          .catch((err) => {
            reject(err);
          });
      }
    });
  },

  //profile

  editUser: (userId, data) => {
    return new Promise(async (resolve, reject) => {
      userId = new objectId(userId)
      data.password = await bcrypt.hash(data.password, 10);
      db.get().collection(collection.USER_COLLECTION)
        .updateOne(
          { _id: userId },
          {
            $set: {
              name: data.name,
              email: data.email,
              mobile: data.mobile,
              password: data.password
            }
          })
        .then(() => { resolve() })
        .catch(() => { reject() })
    })
  },
  editUserPic: (userId, imgData) => {
    return new Promise((resolve, reject) => {
      db.get().collection(collection.USER_COLLECTION)
        .updateOne(
          {
            _id: new objectId(userId)
          },
          {
            $set: {
              image: imgData
            }
          },
          { upsert: true }
        )
        .then((response) => {
          resolve();
        })
        .catch((err) => {
          reject()
        })
    })
  },
  findUser: (userId) => {
    return new Promise((resolve, reject) => {
      db.get().collection(collection.USER_COLLECTION)
        .findOne({ _id: new objectId(userId) })
        .then((response) => { resolve(response) })
    })
  },
  findUserWithMob: (mob) => {
    return new Promise((resolve, reject) => {
      db.get().collection(collection.USER_COLLECTION)
        .findOne({ mobile: mob })
        .then((response) => { resolve(response) })
    })
  },

  //forgotPass
  
  checkuserBlockExist: (email) => {
    let response = {}
    return new Promise(async (resolve, reject) => {
      const user = await db.get().collection(collection.USER_COLLECTION)
        .findOne({ email: email })
      if (user) {
        if (user.status == false) {
          response.status = "User Blocked";
          resolve(response);
        }
        response.mob = user.mobile
        resolve(response)
      } else {
        response.status = 'No user Found'
        resolve(response)
      }
    })
  },
  forgotPassUpdatePass: (userDetails) => {
    return new Promise(async (resolve, reject) => {
      userDetails.password = await bcrypt.hash(userDetails.password, 10);
      db.get().collection(collection.USER_COLLECTION)
        .updateOne(
          { email: userDetails.email },
          {
            $set: {
              password: userDetails.password
            }
          })
        .then(() => { resolve() })
        .catch(() => { reject() })
    })
  },

  //order

  addOrderDetails: (order, userId) => {
    return new Promise(async (resolve, reject) => {

       // Generate a unique code
       const generateUniqueCode = async () => {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let orderId = '';

        // Generate a random 6-character code
        for (let i = 0; i < 6; i++) {
          const randomIndex = Math.floor(Math.random() * characters.length);
          orderId += characters.charAt(randomIndex);
        }

        // Check if the generated code already exists in the order collection
        const existingOrder = await db
          .get()
          .collection(collection.ORDER_COLLECTION)
          .findOne({ orderId });

        // If the code already exists, generate a new one recursively
        if (existingOrder) {
          return generateUniqueCode();
        }

        return orderId;
      };

        // Generate a unique code
        const orderId = await generateUniqueCode();
        order.orderId = orderId;
  

      if (order.coupon != 'undefined') {
        const couponCode = order.coupon;
        const coupon = await db.get().collection(collection.COUPON_COLLECTION).findOne({ code: order.coupon });
        order.coupon = coupon;
        try {
          const couponExists = await db.get().collection(collection.USER_COLLECTION)
            .findOne(
              {
                _id: new objectId(userId),
                usedCoupons: { $elemMatch: { couponCode } }
              }
            )
          if (!couponExists) {
            db.get().collection(collection.USER_COLLECTION)
              .updateOne(
                {
                  _id: new objectId(userId)
                },
                {
                  $push: { usedCoupons: { couponCode } }
                }
              )
              .then(() => { }).catch(() => { });
          }
        } catch (err) {
          console.log(err);
        } finally {
          db.get().collection(collection.ORDER_COLLECTION)
            .insertOne(order)
            .then(async (response) => {
              resolve(response)
              for (let i = 0; i < order.item.length; i++) {
                const a = await db.get().collection(collection.PRODUCT_COLLECTION)
                  .updateOne({
                    _id: order.item[i].product._id
                  }, {
                    $inc: { stock: -order.item[i].quantity }
                  })
              }
            })
            .catch((err) => { reject(err) })
        }
      } else {
        delete order.coupon
        db.get().collection(collection.ORDER_COLLECTION)
          .insertOne(order)
          .then(async (response) => {
            resolve(response)
            for (let i = 0; i < order.item.length; i++) {
              const a = await db.get().collection(collection.PRODUCT_COLLECTION)
                .updateOne({
                  _id: order.item[i].product._id
                }, {
                  $inc: { stock: -order.item[i].quantity }
                })
            }
          })
          .catch((err) => { reject(err) })
      }
    })
  },
  generateRazorpay: (orderId, total) => {
    return new Promise((resolve, reject) => {
      var options = {
        amount: parseInt(total) * 100,
        currency: 'INR',
        receipt: orderId
      }
      instance.orders.create(options, function (err, order) {
        if (err) {
          console.log(err);
        } else {
          resolve(order)
        }
      })
    })
  },
  verifyPayment: (details) => {
    return new Promise((resolve, reject) => {
      let hmac = crypto.createHmac('sha256', instance.key_secret);
      hmac.update(details.response.razorpay_order_id + '|' + details.response.razorpay_payment_id);
      hmac = hmac.digest('hex');
      if (hmac === details.response.razorpay_signature) {
        resolve();
      } else {
        reject();
      }
    });
  },
  changeOrderStatus: (orderId) => {
    return new Promise((resolve, reject) => {
      orderId = new objectId(orderId);
      db.get().collection(collection.ORDER_COLLECTION)
        .updateOne(
          {
            _id: orderId
          },
          {
            $set: {
              status: "Placed"
            }
          }
        )
        .then((response) => {
          resolve(response)
        }).catch((err) => {
          console.log(err);
        })
    });
  },
  changeOrderStatusFailed: (orderId) => {
    return new Promise((resolve, reject) => {
      orderId = new objectId(orderId);
      db.get().collection(collection.ORDER_COLLECTION)
        .updateOne(
          {
            _id: orderId
          },
          {
            $set: {
              status: "Payment failed"
            }
          }
        )
        .then((response) => {
          resolve(response)
        }).catch((err) => {
          console.log(err);
        })
    });
  },
  cancelOrder: (orderId, reason) => {
    return new Promise((resolve, reject) => {
      db.get().collection(collection.ORDER_COLLECTION)
        .updateOne({
          _id: new objectId(orderId)
        },
          {
            $set: {
              "status": "Cancelled",
              "reason": reason
            }
          })
        .then((response) => { resolve(response) })
    })
  },
  returnOrder: (orderId, reason) => {
    return new Promise((resolve, reject) => {
      db.get().collection(collection.ORDER_COLLECTION)
        .updateOne({
          _id: new objectId(orderId)
        },
          {
            $set: {
              "status": "Returned",
              "reason": reason
            }
          })
        .then((response) => { resolve(response) })
    })
  },
  getOrderDetails: (userId) => {
    return new Promise((resolve, reject) => {
      db.get().collection(collection.ORDER_COLLECTION)
        .aggregate([
          { $match: { userId: new objectId(userId) } },
          { $sort: { date: -1 } }
        ])
        .toArray()
        .then((response) => { resolve(response) })
    })
  },
  getSingleOrderDetail: (orderId) => {
    return new Promise((resolve, reject) => {
      db.get().collection(collection.ORDER_COLLECTION)
        .findOne({ _id: new objectId(orderId) })
        .then((response) => { resolve(response) })
    })
  },

  //address

  addAddressPost: (address, userId) => {
    return new Promise((resolve, reject) => {
      Object.assign(address, { id: new objectId() });
      db.get().collection(collection.USER_COLLECTION)
        .updateOne(
          { _id: new objectId(userId) },
          {
            $push: {
              address: address
            }
          }
        ).then(() => { resolve() })
    })
  },
  editAddressPost: (address, userId, addressId) => {
    return new Promise((resolve, reject) => {
      db.get().collection(collection.USER_COLLECTION)
        .updateOne(
          {
            _id: new objectId(userId),
            "address.id": new objectId(addressId) // match the address with the specified id
          },
          {
            $set: {
              "address.$.name": address.name,
              "address.$.mobile": address.mobile,
              "address.$.address": address.address,
              "address.$.city": address.city,
              "address.$.state": address.state,
              "address.$.zipcode": address.zipcode,
              "address.$.type": address.type // optional: update the type field too
            }
          },
          (err, result) => {
            if (err) {
              reject(err);
            } else {
              resolve(result);
            }
          }
        ).then(() => { resolve() })
    });
  },
  getAddressDetails: (userId, addressId) => {
    return new Promise((resolve, reject) => {
      db.get().collection(collection.USER_COLLECTION)
        .aggregate([
          { $match: { _id: new objectId(userId) } },
          { $unwind: "$address" },
          { $match: { "address.id": new objectId(addressId) } },
          { $project: { _id: 0, address: 1 } }
        ])
        .toArray().then((response) => { resolve(response[0]?.address) })
    })
  },
  deleteAddress: (addressId, userId) => {
    return new Promise((resolve, reject) => {
      db.get().collection(collection.USER_COLLECTION)
        .updateOne(
          {
            _id: new objectId(userId),
            "address.id": new objectId(addressId) // match the address with the specified id
          }, {
          $pull: { address: { id: new objectId(addressId) } }
        }
        ).then(() => { resolve() })
    })
  },


  //wishlist

  addToWishlist: (productId, userId) => {
    productId = new objectId(productId)
    return new Promise(async (resolve, reject) => {
      const user = await db.get().collection(collection.WISHLIST_COLLECTION).findOne({ userId: new objectId(userId) })
      const productExist = await db.get().collection(collection.WISHLIST_COLLECTION)
        .findOne({
          userId: new objectId(userId),
          products: { $elemMatch: { productId } }
        })
      if (user) {
        if (!productExist) {
          db.get().collection(collection.WISHLIST_COLLECTION)
            .updateOne(
              {
                userId: new objectId(userId)
              }, {
              $push: { products: { productId } }
            })
            .then(() => { resolve() })
        } else {
          resolve()
        }
      } else {
        db.get().collection(collection.WISHLIST_COLLECTION)
          .insertOne({
            userId: new objectId(userId),
            products: [{ productId: productId }]
          })
          .then((response) => { resolve(response) })
          .catch((err) => { reject(err) })
      }
    })
  },
  getWishlist: (userId) => {
    return new Promise((resolve, reject) => {
      db.get().collection(collection.WISHLIST_COLLECTION)
        .aggregate([
          {
            $match: { userId: new objectId(userId) }
          },
          {
            $unwind: "$products"
          },
          {
            $lookup: {
              from: 'product',
              localField: 'products.productId',
              foreignField: "_id",
              as: "result"
            }
          },
          {
            $project: {
              _id: 0,
              product: { $arrayElemAt: ["$result", 0] }
            }
          }
        ]).toArray()
        .then((response) => {
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  deleteWishlist: (productId, userId) => {
    return new Promise(async (resolve, reject) => {
      await db.get().collection(collection.WISHLIST_COLLECTION)
        .updateOne({ userId: new objectId(userId) }, { $pull: { products: { productId: new objectId(productId) } } })
        .then((response) => { resolve(response) })
        .catch(() => { reject() })
    })
  },


  //wallet

  getWalletPage: (userId) => {
    return new Promise((resolve, reject) => {
      db.get().collection(collection.WALLET_COLLECTION)
        .findOne({ userId: new objectId(userId) })
        .then((response) => {
          resolve(response)
        })
    })
  },

  //coupon

  couponApply: (couponCode, userId) => {
    return new Promise(async (resolve, reject) => {
      const couponExists = await db.get().collection(collection.USER_COLLECTION)
        .findOne(
          {
            _id: new objectId(userId),
            usedCoupons: { $elemMatch: { couponCode } }
          }
        )
      const coupon = await db.get().collection(collection.COUPON_COLLECTION).findOne({ code: couponCode });
      if (coupon) {
        if (couponExists) {
          resolve("couponExists");
        } else {
          resolve(coupon);
        }
      } else {
        resolve(null);
      }
    })
  },
  getActiveBanner: () => {
    return new Promise(async (resolve, reject) => {
      const activeBanner = await db.get().collection(collection.BANNER_COLLECTION).findOne({ active: true });
      resolve(activeBanner);
    });
  },

}