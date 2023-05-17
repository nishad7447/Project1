const db = require('../config/connection');
const { response } = require('express');
const collection=require('../config/collection')
const objectId = require('mongodb-legacy').ObjectId; 

module.exports = {
    getCartDetails: (userId) => {
        return new Promise((resolve, reject) => {
          db.get().collection(collection.CART_COLLECTION)
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
                  product: { $arrayElemAt: ["$result", 0] },
                  quantity: "$products.quantity"
                }
              }
          ]).toArray()
            .then((response) => {
              resolve( resolve(response));
            })
            .catch((err) => {
              reject(err);
            });
        });
      },
    addToCart:(productId,userId,quantity)=>{
        productId=new objectId(productId)
        return new Promise(async(resolve,reject)=>{
            const user=await db.get().collection(collection.CART_COLLECTION).findOne({userId:new objectId(userId)})
            const productExist=await db.get().collection(collection.CART_COLLECTION)
            .findOne({
                userId:new objectId(userId),
                products:{$elemMatch:{productId}}
            })
            if(user){
                if(productExist){
                    db.get().collection(collection.CART_COLLECTION)
                    .updateOne(
                        {
                            userId:new objectId(userId),
                            products:{$elemMatch:{productId}}
                        },{
                            $inc:{'products.$.quantity':quantity}
                        })
                        .then(()=>{resolve()})
                }else{
                    db.get().collection(collection.CART_COLLECTION)
                    .updateOne(
                        {userId:new objectId(userId)},
                        {$push:{products:{productId,quantity:Number(quantity)}}}
                    )
                    .then(()=>{resolve()})
                }
            }else{
                const cartObj={
                    userId:new objectId(userId),
                    products:[{productId:productId,quantity:Number(quantity)}]
                }
                db.get().collection(collection.CART_COLLECTION)
                .insertOne(cartObj)
                .then((response)=>{resolve(response)})
                .catch((err)=>{reject(err)})
            }
        })
    },
    changeProductQuantity:(userId,details)=>{
      productId=new objectId(details.product)
      
      count=parseInt(details.count)
      quantity=parseInt(details.quantity)

      return new Promise((resolve,reject)=>{

        if(count==-1 && quantity==1){
          db.get().collection(collection.CART_COLLECTION)
          .updateOne(
            {userId: new objectId(userId)},
            {
              $pull:{products:{productId: productId}}
            }
            )
            .then((response)=>{resolve({removeProduct:true})})
        }else{
        db.get().collection(collection.CART_COLLECTION)
        .updateOne(
                {
                  userId: new objectId(userId), 
                  products:{$elemMatch:{productId}}
              },
          {
            $inc:{'products.$.quantity':count}
          }
        )
        .then((response)=>{
          resolve({status:true})})
        }
      })
    },
    getCartTotal:(userId)=>{
        return new Promise((resolve, reject) => {
          db.get().collection(collection.CART_COLLECTION)
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
                  product: { $arrayElemAt: ["$result", 0] },
                  quantity: "$products.quantity"
                }
              },
              {
                $group:{
                  _id:null,
                  total:{$sum:{$multiply:['$quantity','$product.price']}}
                }
              }
          ]).toArray()
            .then((response) => {
                resolve(response[0]?.total)
            })
            .catch((err) => {
              reject(err);
            });
        });      
    },
    deleteCartItem:(productId,userId)=>{
        return new Promise(async(resolve,reject)=>{
           await db.get().collection(collection.CART_COLLECTION)
            .updateOne({userId:new objectId(userId)},{$pull: { products: { productId: new objectId(productId) } }})
            .then((response)=>{resolve(response)})
            .catch(()=>{reject()})
        }) 
    },
    removeCartOfUser:(userId)=>{
      return new Promise((resolve,reject)=>{
        db.get().collection(collection.CART_COLLECTION)
        .deleteOne(
          { userId: new objectId(userId) }
        )
        .then(()=>{resolve()})
      })
    }

}