const express=require('express')
const path=require('path')
const session=require('express-session')
const bodyparser=require('body-parser')
const nocache=require('nocache')
const db=require('./config/connection')
const app=express()
require('dotenv').config();

const adminRouter=require('./routes/admin')
const userRouter=require('./routes/user')

app.set('view engine','ejs') 
app.use(express.static(path.join(__dirname,'public')))
//seting up session
app.use(session({
    secret:"my_secret_key",
    resave:false,
    saveUninitialized:false, 
    cookie:{secure:false} //if using HTTPS set true
  }))
app.use(bodyparser.urlencoded({extended:true}))
app.use(bodyparser.json());
app.use(nocache())
app.use('/admin',adminRouter)
app.use('/',userRouter)
app.use((req, res, next) => {
  res.status(404).render('layout/404',{ user: req.session.user,userName: req.session.userName});
});

db.connect((err)=>{
  if(err)console.log("Connection err",err);
  else console.log("DB connected");
})

app.listen(3001,()=>{
    console.log('server started in http://localhost:3001 !!');
  })
