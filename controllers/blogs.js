const blogsRouter = require('express').Router();
const Blog = require('../models/blog');
const User = require('../models/user');
const jwt = require('jsonwebtoken');

blogsRouter.get('/', async (request, response) => {
  // old style .then chains
  // Blog.find({})
  //   .then(returnedBlogs => returnedBlogs.map(blog => blog.toJSON()))
  //   .then(returnedAndFormattedBlogs => response.json(returnedAndFormattedBlogs));

  //populate will take the ids saved in the user field of the blog model
  //then fetch user objects using those ids
  //there is a ref:'User' in the blog model definition
  //username:1, name:1 means that
  //we only want to see the username and name of the fetched users
  const blogs = await Blog
    .find({}).populate('user', { username:1, name:1 });
  response.json(blogs);
});


blogsRouter.post('/', async (request, response, next) => {
  const body = request.body;

  //the authorization token that comes with the 'Authorization' request headers
  //is assigned to the request object as a property .token by the tokenExtractor middleware
  const decodedToken = jwt.verify(request.token, process.env.SECRET);

  //the missing or incorrect token problems are handled by the errorHandler middleware
  //this if block does not seem to do anything
  if(!request.token || !decodedToken.id){
    return response.status(401).json({ error: 'token missing or invalid' });
  }

  const user = await User.findById(decodedToken.id);

  const blog = new Blog({
    title: body.title,
    author: body.author || 'unknown',
    url: body.url,
    likes: body.likes || 0,
    user: user._id
  });

  // old style .then chains
  // blog.save()
  //   .then(savedBlog => savedBlog.toJSON())
  //   .then(savedAndFormattedBlog => response.status(201).json(savedAndFormattedBlog))
  //   .catch(error => next(error));

  // we don't need try catch for because we have installed express-async-errors
  // this library automatically transfers any exception to the errorHandler middleware
  // the next in the parameter is no longer needed it is there for future reference
  // try{
  //   const savedBlog = await blog.save();
  //   response.status(201).json(savedBlog);
  // }catch(exception){
  //   next(exception);
  // }

  const savedBlog = await blog.save();

  // we need to add the savedBlog's id to the user's blogs list
  user.blogs = user.blogs.concat(savedBlog._id);
  await user.save();

  response.status(201).json(savedBlog);
});


blogsRouter.delete('/:id', async (request, response) => {
  //the authorization token that comes with the 'Authorization' request headers
  //is assigned to the request object as a property .token by the tokenExtractor middleware
  const decodedToken = jwt.verify(request.token, process.env.SECRET);

  //the missing or incorrect token problems are handled by the errorHandler middleware
  //this if block does not seem to do anything
  if(!request.token || !decodedToken.id){
    return response.status(401).json({ error: 'token missing or invalid' });
  }

  // checking if this blog was created by the currently logged in user
  const user = await User.findById(decodedToken.id);
  const blog = await Blog.findById(request.params.id);

  if(!(user && blog && blog.user.toString() === user._id.toString())){
    return response.status(401).json({ error: 'a blog can only be deleted by it\'s creator' });
  }

  // the express-async-errors library will
  // transfer the exceptions to the errorHandler middleware
  await Blog.findByIdAndDelete(request.params.id);

  //removing the deleted blog's id from the user's blogs array
  user.blogs = user.blogs.filter(blogId => blogId.toString() !== request.params.id);
  await user.save();

  response.status(204).end();
});


blogsRouter.put('/:id', async (request, response) => {
  const oldBlog = await Blog.findById(request.params.id);
  //the edited object is not a model
  //it's a normal javascript object
  const newBlog = {
    title : request.body.title || oldBlog.title,
    author : request.body.author || oldBlog.author,
    url : request.body.url || oldBlog.url,
    likes : request.body.likes || oldBlog.likes
  };

  //normally validators don't work while editing
  //adding runValidators : true will enforce validations during editing
  //normally findByIdAndUpdate returns the old object
  // new : true will make it return the new edited object
  // the exceptins are forwarded to the errorHandler middleware
  // by the express-async-errors library
  const editedBlog = await Blog.findByIdAndUpdate(request.params.id, newBlog, { new : true, runValidators : true });
  if(editedBlog){
    response.json(editedBlog.toJSON());
  }
  else{
    response.status(404).end();
  }

});

module.exports = blogsRouter;