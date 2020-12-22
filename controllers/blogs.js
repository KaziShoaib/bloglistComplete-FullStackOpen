const blogsRouter = require('express').Router();
const Blog = require('../models/blog');

blogsRouter.get('/', async (request, response) => {
  // old style .then chains
  // Blog.find({})
  //   .then(returnedBlogs => returnedBlogs.map(blog => blog.toJSON()))
  //   .then(returnedAndFormattedBlogs => response.json(returnedAndFormattedBlogs));

  const blogs = await Blog.find({});
  response.json(blogs);
});


blogsRouter.post('/', async (request, response, next) => {
  const body = request.body;

  const blog = new Blog({
    title: body.title,
    author: body.author || 'unknown',
    url: body.url,
    likes: body.likes || 0
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
  response.status(201).json(savedBlog);
});


blogsRouter.delete('/:id', async (request, response) => {
  // the express-async-errors library will
  // transfer the exceptions to the errorHandler middleware
  await Blog.findByIdAndDelete(request.params.id);
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