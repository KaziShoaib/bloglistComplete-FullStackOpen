const bcrypt = require('bcryptjs');
const User = require('../models/user');
const usersRouter = require('express').Router();


usersRouter.get('/', async (request, response) => {
  //populate will take the ids saved in the blogs field of the user model
  //then fetch the blog objects using those ids
  //there is a ref 'Blog' in the user model definition
  //title:1, author:1, url:1 means
  //we want to see only the title, author and url of the fetched blogs
  const users = await User
    .find({}).populate('blogs', {
      title:1,
      author:1,
      url:1
    });
  response.json(users);
});


usersRouter.post('/', async (request, response) => {
  const body = request.body;
  //minimum password length has to be checked by the router
  //because the database saves the hashed password, not the real one
  if(!body.password || body.password.length < 3){
    return response.status(400).json({
      error: 'password must be at least 3 characters long'
    });
  }
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(body.password, saltRounds);
  const user = new User({
    username: body.username,
    name: body.name,
    passwordHash,
  });
  const savedUser = await user.save();
  response.json(savedUser);
});

module.exports = usersRouter;