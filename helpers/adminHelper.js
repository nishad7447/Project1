const db = require("../config/connection");
const collection = require("../config/collection");
const { ObjectId } = require("mongodb-legacy");

module.exports = {
  doLogin: (userData) => {
    return new Promise(async (resolve, reject) => {
      const response = {};
      const user = await db
        .get()
        .collection(collection.ADMIN_COLLECTION)
        .findOne({ email: userData.email });
      if (user) {
        if (userData.password == user.password) {
          response.user = user;
          resolve(response);
        } else {
          response.status = "Invalid Password";
          resolve(response);
        }
      } else {
        response.status = "Invalid User";
        resolve(response);
      }
    });
  },
  getUser: () => {
    return new Promise(async (resolve, reject) => {
      const userData = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .find()
        .toArray();
      resolve(userData);
    });
  },
  editUser: (userId, data) => {
    return new Promise(async (resolve, reject) => {
      userId = new ObjectId(userId);
      db.get()
        .collection(collection.USER_COLLECTION)
        .updateOne(
          { _id: userId },
          {
            $set: {
              name: data.name,
              email: data.email,
              mobile: data.mobile,
            },
          }
        )
        .then((response) => {
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  searchUser: (search) => {
    return new Promise(async (resolve, reject) => {
      const userData = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .find({ name: { $regex: new RegExp(search), $options: "i" } })
        .toArray()
        .then((userData) => {
          resolve(userData);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  blockUser: (userId) => {
    return new Promise(async (resolve, reject) => {
      userId = new ObjectId(userId);
      const user = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ _id: userId });
      if (user.status == true) {
        db.get()
          .collection(collection.USER_COLLECTION)
          .updateOne({ _id: userId }, { $set: { status: false } })
          .then((response) => {
            resolve(response);
          })
          .catch(() => {
            reject();
          });
      } else {
        db.get()
          .collection(collection.USER_COLLECTION)
          .updateOne({ _id: userId }, { $set: { status: true } })
          .then((response) => {
            resolve(response);
          })
          .catch(() => {
            reject();
          });
      }
    });
  },
  deleteUser: (userId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.USER_COLLECTION)
        .deleteOne({ _id: new ObjectId(userId) })
        .then((response) => {
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  getAllOrders: () => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.ORDER_COLLECTION)
        .find()
        .sort({ date: -1 })
        .toArray()
        .then((response) => {
          resolve(response);
        });
    });
  },
  changeOrderStatus: (orderId, status) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.ORDER_COLLECTION)
        .updateOne(
          {
            _id: new ObjectId(orderId),
          },
          {
            $set: {
              status: status,
            },
          }
        )
        .then((response) => {
          resolve(response);
        });
    });
  },
  refund: (orderDetail) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.ORDER_COLLECTION)
        .updateOne(
          {
            _id: new ObjectId(orderDetail.orderId),
          },
          {
            $set: {
              status: orderDetail.status,
            },
          }
        )
        .then(async (response) => {
          const currentDate = new Date().toISOString();
          const source = orderDetail.reason
          const orderId = new ObjectId(orderDetail.orderId)
          const amount = parseInt(orderDetail.amount)
          const userWalletExist = await db
            .get()
            .collection(collection.WALLET_COLLECTION)
            .findOne({ userId: new ObjectId(orderDetail.userId) });
          if (userWalletExist) {
            db.get()
              .collection(collection.WALLET_COLLECTION)
              .updateOne(
                { userId: new ObjectId(orderDetail.userId) },
                {
                  $inc: { bal: amount },
                  $push: {
                    data: {
                      orderId: orderId,
                      date: currentDate,
                      source: source,
                      transAmt: amount
                    }
                  }
                }
              );
          } else {
            db.get()
              .collection(collection.WALLET_COLLECTION)
              .insertOne({
                userId: new ObjectId(orderDetail.userId),
                bal: amount,
                data: [
                  {
                    orderId: orderId,
                    date: currentDate,
                    source: source,
                    transAmt: amount
                  }
                ]
              });
          }
          resolve(response);
        });
    });
  },
  searchOrder: (search) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.ORDER_COLLECTION)
        .find({ userName: { $regex: new RegExp(search), $options: "i" } })
        .toArray()
        .then((order) => {
          resolve(order);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  getUsersCount: () => {
    return new Promise(async (resolve, reject) => {
      const users = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .find()
        .toArray();
      const userCount = users.length > 0 ? users.length : 0;
      resolve(userCount);
    }).catch(() => {
      reject(null);
    });
  },
  getLastMonthTotal: () => {
    return new Promise(async (resolve, reject) => {
      try {
        const lastMonthDate = new Date();
        lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);

        const total = await db
          .get()
          .collection(collection.ORDER_COLLECTION)
          .aggregate([
            {
              $match: {
                status: "Delivered",
                date: { $gte: lastMonthDate },
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: { $toDouble: "$total" } },
              },
            },
          ])
          .toArray();
        if (total.length > 0) {
          resolve(total[0].total);
        } else {
          resolve(0);
        }
      } catch (err) {
        reject(err);
      }
    });
  },
  getOrderTotalPrice: () => {
    return new Promise(async (resolve, reject) => {
      const totalOrderPrice = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $match: {
              status: "Delivered",
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: { $toDouble: "$total" } },
            },
          },
        ])
        .toArray();
      if (totalOrderPrice.length > 0) {
        resolve(totalOrderPrice[0].total);
      } else {
        resolve(0);
      }
    });
  },
  getDeliveredOrders: () => {
    return new Promise(async (resolve, reject) => {
      const orders = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $match: {
              status: "Delivered",
            },
          },
        ])
        .toArray();
      if (orders.length > 0) {
        resolve(orders);
      } else {
        resolve(0);
      }
    });
  },
  filterDate: (dates) => {
    return new Promise(async (resolve, reject) => {
      let newDate = [];
      dates.forEach((eachDate) => {
        const date = new Date(eachDate);
        const year = date.getFullYear();
        const month = date.getMonth() + 1; // add 1 because months are zero-indexed
        const day = date.getDate();
        const formattedDate = `${year}-${month < 10 ? "0" + month : month}-${day < 10 ? "0" + day : day
          }`;
        newDate.push(formattedDate);
      });
      const report = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $match: {
              status: "Delivered",
              date: {
                $gte: new Date(newDate[0]),
                $lt: new Date(newDate[1]),
              },
            },
          },
        ])
        .toArray();
      resolve(report);
    });
  },
  getMonthCount: (month, year) => {
    return new Promise(async (resolve, reject) => {
      try {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        // const total = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
        //   {
        //     $match: {
        //       status: "Delivered",
        //       date: { $gte: startDate, $lte: endDate }
        //     }
        //   },
        //   {
        //     $group: {
        //       _id: null,
        //       total: { $sum: { $toDouble: "$total" } }
        //     }
        //   }
        // ]).toArray();
        const count = await db
          .get()
          .collection(collection.ORDER_COLLECTION)
          .countDocuments({
            status: "Delivered",
            date: { $gte: startDate, $lte: endDate },
          });

        resolve(count);
      } catch (err) {
        reject(err);
      }
    });
  },
  getOrderStatus:(status)=>{
    return new Promise(async (resolve, reject) => {
      try {
        const count = await db
          .get()
          .collection(collection.ORDER_COLLECTION)
          .countDocuments({
            status: status,
          });

        resolve(count);
      } catch (err) {
        reject(err);
      }
    });
  },
  getProducts: () => {
    return new Promise(async (resolve, reject) => {
      const productData = await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .find()
        .toArray();
      if (productData) {
        resolve(productData);
      } else {
        resolve("No data to show");
      }
    });
  },
  getCoupons: () => {
    return new Promise(async (resolve, reject) => {
      const coupons = await db.get().collection(collection.COUPON_COLLECTION).find().toArray();
      const newDate = new Date();
      coupons.forEach(coupon => {
        if (coupon.date < newDate) {
          coupon.status = "EXPIRED";
        }
        const date = coupon.date;
        const year = date.getFullYear();
        const month = date.getMonth() + 1; // add 1 because months are zero-indexed
        const day = date.getDate();
        const formattedDate = `${day < 10 ? '0' + day : day}-${month < 10 ? '0' + month : month}-${year}`;
        coupon.date = formattedDate;
      });
      resolve(coupons);
    });
  },
  addCoupon: (coupon) => {
    return new Promise(async (resolve, reject) => {
      coupon.discount = Number(coupon.discount);
      coupon.date = new Date(coupon.date);
      coupon.status = true;
      const newDate = new Date();
      if (coupon.date < newDate) {
        coupon.status = "EXPIRED";
      }
      const couponExists = await db.get().collection(collection.COUPON_COLLECTION).findOne({ code: coupon.code });
      if (couponExists) {
        resolve(null);
      } else {
        db.get().collection(collection.COUPON_COLLECTION).insertOne(coupon).then((response) => {
          resolve();
        })
          .catch(() => {
            reject();
          });
      }
    });
  },
  editCoupon: (couponId, coupon) => {
    return new Promise((resolve, reject) => {
      coupon.date = new Date(coupon.date);
      coupon.status = true;
      const newDate = new Date();
      if (coupon.date < newDate) {
        coupon.status = "EXPIRED";
      }
      db.get().collection(collection.COUPON_COLLECTION)
        .updateOne(
          {
            _id: new ObjectId(couponId)
          },
          {
            $set: {
              code: coupon.code,
              discount: Number(coupon.discount),
              desc: coupon.desc,
              date: coupon.date,
              status: coupon.status
            }
          }
        )
        .then(() => {
          resolve();
        })
        .catch(() => {
          reject();
        })
    })
  },
  deactivateCoupon: (couponId) => {
    return new Promise((resolve, reject) => {
      db.get().collection(collection.COUPON_COLLECTION)
        .updateOne(
          {
            _id: new ObjectId(couponId)
          },
          {
            $set: {
              status: "DEACTIVATED"
            }
          }
        )
        .then((response) => {
          resolve();
        })
        .catch(() => {
          reject();
        })
    })
  },
  activateCoupon: (couponId) => {
    return new Promise((resolve, reject) => {
      db.get().collection(collection.COUPON_COLLECTION)
        .updateOne(
          {
            _id: new ObjectId(couponId)
          },
          {
            $set: {
              status: true
            }
          }
        )
        .then((response) => {
          resolve();
        })
        .catch(() => {
          reject();
        })
    })
  },
  getBanners: () => {
    return new Promise(async (resolve, reject) => {
      const banners = await db.get().collection(collection.BANNER_COLLECTION).find().toArray();
      resolve(banners);
    });
  },
  addBanner: (bannerDetails) => {
    return new Promise((resolve, reject) => {
      db.get().collection(collection.BANNER_COLLECTION).insertOne(bannerDetails).then((response) => {
        resolve(response);
      });
    });
  },
  editBanner: (bannerId, bannerDetails) => {
    return new Promise((resolve, reject) => {
      bannerId = new ObjectId(bannerId);
      db.get().collection(collection.BANNER_COLLECTION)
        .updateOne(
          {
            _id: bannerId
          },
          {
            $set: {
              bannerName: bannerDetails.bannerName,
            }
          }
        )
        .then((response) => {
          resolve(response);
        })
    });
  },
  editImageUpload: (bannerId, imgUrl) => {
    return new Promise((resolve, reject) => {
      bannerId = new ObjectId(bannerId);
      db.get().collection(collection.BANNER_COLLECTION)
        .updateOne(
          {
            _id: bannerId
          },
          {
            $set: {
              image: imgUrl
            }
          }
        ).then((response) => {
          resolve(response);
        })
    });
  },
  selectBanner: (bannerId) => {
    return new Promise((resolve, reject) => {
      bannerId = new ObjectId(bannerId);
      db.get().collection(collection.BANNER_COLLECTION)
        .updateMany(
          {},
          {
            $set: {
              active: false
            }
          }
        )
      db.get().collection(collection.BANNER_COLLECTION)
        .updateOne(
          {
            _id: bannerId
          },
          {
            $set: {
              active: true
            }
          }
        )
        .then((response) => {
          resolve(response);
        });
    });
  },
};
