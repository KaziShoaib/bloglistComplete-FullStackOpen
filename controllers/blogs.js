const blogsRouter = require('Express').Router();
const Blog = require('../models/blog');

blogsRouter.get('/', (request, response) => {
  Blog.find({})
    .then(returnedBlogs => returnedBlogs.map(blog => blog.toJSON()))
    .then(returnedAndFormattedBlogs => response.json(returnedAndFormattedBlogs));
});


blogsRouter.post('/', (request, response, next) => {
  const body = request.body;

  const blog = new Blog({
    title: body.title || 'untitled',
    author: body.author || 'unknown',
    url: body.url || 'unspecified',
    likes: body.likes || 0
  });

  blog.save()
    .then(savedBlog => savedBlog.toJSON())
    .then(savedAndFormattedBlog => response.status(201).json(savedAndFormattedBlog))
    .catch(error => next(error));
});

module.exports = blogsRouter;