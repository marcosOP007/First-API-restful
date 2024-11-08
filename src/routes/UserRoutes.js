const {Router} = require('express');
const path = require('path');
const UserController = require('../Controller/UserController')
const TemperatureLogController = require('../Controller/TemperatureLogController')
const ChannelController = require('../Controller/ChannelController')
const SensorController = require('../Controller/SensorController');
const User = require('../models/User');
const bcrypt = require("bcrypt"); 
const jwt = require("jsonwebtoken");
const middleAuth = require('../MiddleWares/AuthMiddle');
const AuthorizationMiddle = require('../MiddleWares/AuthorizationMiddle');
const permissionCheck = require('../MiddleWares/permissionCheck');

//const { userExists } = require('./dbfuncitons');
const router = Router();



router.post('/login', async (req, res) => {
  console.log("received login")
  const { email, password } = req.body;

  // validations
  if (!email) {
    return res.render(path.join(__dirname, '../views/html/public/login.ejs'), {message: "O email é obrigatório!"})
  }

  if (!password) {
    return res.render(path.join(__dirname, '../views/html/public/login.ejs'), {message: "A senha é obrigatória!"})

  }

  // check if user exists
  const user = await UserController.getUserByEmail(email);

  if (!user) {
    return res.render(path.join(__dirname, '../views/html/public/login.ejs'), {message: "email ou senha incorreto"})
  }
      
// check if password match
  const checkPassword = await bcrypt.compare(password, user.hash_password);

  if (!checkPassword) {
    return res.render(path.join(__dirname, '../views/html/public/login.ejs'), {message: "email ou senha incorreto"})
  }
  
  try {
    const secret = process.env.SECRET;

    const token = jwt.sign({id: user.id}, secret, {expiresIn: '24h'});
    res.cookie("token", token, {
      httpOnly: true,
    });

    
    res.redirect(`/index/${user.id}`)
    
    
  } catch (error) {
    return res.render(path.join(__dirname, '../views/html/public/login.ejs'), {message: 'Erro no Servidor, tente mais tarde'})

  }

})


router.get('/logout', async (req,res) => {
  try{
    res.clearCookie('token', {path:'/'})

    res.status(200).redirect('/index/login/');
  }catch(err){
    console.log(err)
  }
})


router.post('/register', async (req, res, next) => {
  const { name, email, password, confirmPassword } = req.body;
  
  
  if(!name ) 
      return res.render(path.join(__dirname, '../views/html/public/registro.ejs'), {message: "nome obrigatório!!"})
  else if(!email )   
      return res.render(path.join(__dirname, '../views/html/public/registro.ejs'), {message: "email obrigatório!!"})
  else if(!password ) 
      return res.render(path.join(__dirname, '../views/html/public/registro.ejs'), {message: "senha obrigatória!!"})
  else if(confirmPassword !== password) 
      return res.render(path.join(__dirname, '../views/html/public/registro.ejs'), {message: "senhas diferente"})
  


  userExists = await UserController.getUserByEmail(email);
  

  if (userExists) {
    return res.render(path.join(__dirname, '../views/html/public/registro.ejs'), {message: "Email usado", nome:"rapaz"})
      
  }



  
  try{
      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(password, salt);


      User.create({name, email, hash_password: passwordHash, permission_type: 'USER'})

      return res.redirect('/index/login');
  }catch(error){
      console.log("Erro no cadastro de User: ", error);
      
      res.status(500).json({ msg: 'error no servidor, tente mais tarde novamente!' });
  }
  


})



router.get('/delet-moderator/:id',permissionCheck.verifyUserPermission("ADMIN"), async (req, res, next) => {
  
  try{
      await UserController.deleteUser(req.params.id)

      return res.redirect('/index/'+ req.user_id);
  }catch(error){
      console.log("Erro ao deletar moderador: ", error);
      
      res.status(500).json({ msg: 'error no servidor, tente mais tarde novamente!' });
  }
})

router.post('/inv-status/:id', permissionCheck.verifyUserPermission('ADMIN'), async (req, res, next) => {
  
  try{
      await UserController.updateUser(req.params.id,{status: req.body.state})

      res.status(200).json({msg: 'sucesso na requisição'})
  }catch(error){
      console.log("Erro ao deletar moderador: ", error);
      
      res.status(500).json({ msg: 'error no servidor, tente mais tarde novamente!' });
  }
})


router.post('/changed-perm/:id', permissionCheck.verifyUserPermission('ADMIN'), async (req, res, next) => {
  if(!req.body.perm) return res.status(401).json({msg: 'requisição inválida'});
  try{
      await UserController.updateUser(req.params.id,{permission_type: req.body.perm})

      res.status(200).json({msg: 'sucesso na requisição'})
  }catch(error){
      console.log("Erro ao deletar moderador: ", error);
      
      res.status(500).json({ msg: 'error no servidor, tente mais tarde novamente!' });
  }
})






module.exports = router;


