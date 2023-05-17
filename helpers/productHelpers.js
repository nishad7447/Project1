const db = require('../config/connection');
const collection = require('../config/collection');
const objectId = require('mongodb-legacy').ObjectId;

module.exports = {

  //product Category--

  addProductCategory: (category) => {
    return new Promise(async (resolve, reject) => {
      const categoryExist = await db
        .get()
        .collection(collection.CATEGORY_COLLECTION)
        .findOne({ category: category });
      if (categoryExist) {
        reject("Category Exist");
      } else {
        db.get()
          .collection(collection.CATEGORY_COLLECTION)
          .insertOne({ category: category, listed: true })
          .then(() => {
            resolve();
          })
          .catch(() => {
            reject();
          });
      }
    });
  },
  getProductCategory: () => {
    return new Promise(async (resolve, reject) => {
      const category = await db
        .get()
        .collection(collection.CATEGORY_COLLECTION)
        .find({ listed: true })
        .toArray();
      resolve(category);
    });
  },
  deleteProductCategory: (cateId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.CATEGORY_COLLECTION)
        .updateOne({ _id: new objectId(cateId) }, { $set: { listed: false } })
        .then(async (response) => {
          await db.get().collection(collection.PRODUCT_COLLECTION).updateMany({ categoryId: new objectId(cateId) }, { $set: { listed: false } })
          resolve();
        })
        .catch(() => {
          reject();
        });
    });
  },
  getCategoryId: (category) => {
    return new Promise((resolve, reject) => {
      db.get().collection(collection.CATEGORY_COLLECTION)
        .findOne({ category: category })
        .then((response) => { resolve(response) })
    })
  },
  listCategory: (cateId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.CATEGORY_COLLECTION)
        .updateOne({ _id: new objectId(cateId) }, { $set: { listed: true } })
        .then(async (response) => {
          await db.get().collection(collection.PRODUCT_COLLECTION).updateMany({ categoryId: new objectId(cateId) }, { $set: { listed: true } })
          resolve();
        })
        .catch(() => {
          reject();
        });
    });
  },



  //userSide product Categorized

  productCategorized: (category, currentPage) => {
    return new Promise((resolve, reject) => {
      currentPage = parseInt(currentPage)
      const limit = 6
      const skip = (currentPage - 1) * limit
      db.get().collection(collection.CATEGORY_COLLECTION)
        .aggregate(
          [
            {
              '$match': {
                'category': category,
                listed: true
              }
            }, {
              '$lookup': {
                'from': 'product',
                'localField': 'category',
                'foreignField': 'category',
                'as': 'result'
              }
            }
          ]
        ).skip(skip).limit(limit).toArray()
        .then((response) => { resolve(response[0]?.result); })
        .catch((err) => { console.log(err); })
    })
  },

  //filter
  
  filterPrice: (minPrice, maxPrice) => {
    return new Promise(async (resolve, reject) => {
      try {
        const products = await db.get().collection(collection.PRODUCT_COLLECTION)
          .find({
            $and: [
              { price: { $gte: parseInt(minPrice) } },
              { price: { $lte: parseInt(maxPrice) } }
            ]
          }).toArray()
        resolve(products)
      } catch {
        resolve(null)
      }
    })
  },
  //sort

  sortPrice: (details) => {
    return new Promise(async (resolve, reject) => {
      try {
        const minPrice = details.minPrice
        const maxPrice = details.maxPrice
        const value = details.sort;
        const products = await db.get().collection(collection.PRODUCT_COLLECTION)
          .find({
            $and: [
              { price: { $gte: parseInt(minPrice) } },
              { price: { $lte: parseInt(maxPrice) } }
            ]
          }).sort({ price: value }).toArray();
        resolve(products);
      } catch {
        resolve(null);
      }
    });
  },

  //product --

  addProducts: (product) => {
    return new Promise((resolve, reject) => {
      product.price = Number(product.price);
      product.stock = Number(product.stock);
      Object.assign(product, { listed: true });
      db.get().collection(collection.PRODUCT_COLLECTION).insertOne(product).then((data) => {
        resolve(data.insertedId);
      })
    })
  },
  getAllProducts: () => {
    return new Promise((resolve, reject) => {
      db.get().collection(collection.PRODUCT_COLLECTION)
        .find().toArray()
        .then((productData) => { resolve(productData) })
    })
  },
  getProducts: (currentPage) => {
    return new Promise(async (resolve, reject) => {
      currentPage = parseInt(currentPage);
      const limit = 6;
      const skip = (currentPage - 1) * limit;
      const productData = await db.get().collection(collection.PRODUCT_COLLECTION).find({ listed: true }).skip(skip).limit(limit).toArray();
      if (productData) {
        resolve(productData);
      } else {
        resolve("No data to show")
      }
    })
  },
  addProductImage: (id, imgUrls) => {
    return new Promise((resolve, reject) => {
      db.get().collection(collection.PRODUCT_COLLECTION)
        .updateOne(
          {
            _id: new objectId(id)
          },
          {
            $set: {
              images: imgUrls
            }
          }
        )
        .then((response) => {
          resolve();
        })
        .catch((err) => {
          reject()
        })
    })
  },
  getSingleProductDetaile: (productId) => {
    return new Promise(async (resolve, reject) => {
      db.get().collection(collection.PRODUCT_COLLECTION).find(
        { _id: new objectId(productId) }
      ).toArray()
        .then((response) => {
          resolve(response)
        })
        .catch((err) => {
          reject(err)
        })
    })
  },
  relatedProduct: (productCategory) => {
    return new Promise((resolve, reject) => {
      db.get().collection(collection.PRODUCT_COLLECTION)
        .find({ category: productCategory, listed: true })
        .limit(3)
        .toArray()
        .then((response) => {
          resolve(response)
        })
        .catch((err) => {
          reject(err)
        })
    })
  },
  editProduct: (productId, data) => {
    return new Promise((resolve, reject) => {
      productId = new objectId(productId)
      db.get().collection(collection.PRODUCT_COLLECTION)
        .updateOne(
          {
            _id: productId
          },
          {
            $set: {
              name: data.name,
              category: data.category,
              categoryId: data.categoryId,
              description: data.description,
              price: Number(data.price),
              stock: Number(data.stock),
              listed: true
            }
          }
        ).then((response) => {
          resolve()
        }).catch((err) => {
          reject();
        })
    })
  },
  editProductImage: (id, imgUrls) => {
    return new Promise((resolve, reject) => {
      for (let i = 0; i < imgUrls.length; i++) {
        db.get().collection(collection.PRODUCT_COLLECTION)
          .updateOne(
            {
              _id: new objectId(id)
            },
            {
              $push: {
                images: imgUrls[i]
              }
            }
          ).then((response) => {
            if (i == imgUrls.length) {
              resolve()
            }
          }).catch((err) => {
            reject()
          })
      }
    })
  },
  searchProduct: (search) => {
    return new Promise(async (resolve, reject) => {
      await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .find({ name: { $regex: new RegExp(search), $options: "i" } })
        .toArray()
        .then((productData) => {
          resolve(productData);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  deleteProducts: (productId) => {
    return new Promise((resolve, reject) => {
      db.get().collection(collection.PRODUCT_COLLECTION).updateOne(
        {
          _id: new objectId(productId)
        },
        {
          $set: {
            listed: false,
            stock: 0
          }
        }
      )
        .then((response) => {
          resolve()
        })
        .catch((err) => {
          reject()
        })
    })
  },
  deleteSelectedImg: (productId, imgUrl, imgIndex) => {
    return new Promise((resolve, reject) => {
      db.get().collection(collection.PRODUCT_COLLECTION)
        .updateOne({ _id: new objectId(productId) }, { $pull: { images: imgUrl } })
        .then((response) => { resolve(response) })
        .catch((err) => { reject(err) })
    })
  },
  totalOrdersPlaced: () => {
    return new Promise(async (resolve, reject) => {
      try {
        const ordersPlacedCount = await db.get().collection(collection.ORDER_COLLECTION).countDocuments();
        resolve(ordersPlacedCount);
      } catch {
        resolve(0);
      }
    })
  },
  totalPages: () => {
    return new Promise(async (resolve, reject) => {
      const totalCount = await db.get().collection(collection.PRODUCT_COLLECTION).countDocuments({})
      resolve(totalCount)
    })
  },
  totalCategoryPages: (category) => {
    return new Promise((resolve, reject) => {
      const count = db.get().collection(collection.CATEGORY_COLLECTION).aggregate(
        [
          {
            '$match': {
              'category': category
            }
          }, {
            '$lookup': {
              'from': 'product',
              'localField': 'category',
              'foreignField': 'category',
              'as': 'productDetails'
            }
          }, {
            '$unwind': '$productDetails'
          }, {
            '$count': 'totalProducts'
          }
        ]).toArray()
        .then((count) => {
          const totalCount = count[0].totalProducts;
          resolve(totalCount);
        }).catch((err) => {
          console.log(err);
        })

    })
  }
}