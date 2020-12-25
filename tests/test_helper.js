// helper file for blog_api.test.js

const Blog = require('../models/blog');
const User = require('../models/user');

const initialBlogs = [
  {
    title: 'React patterns',
    author: 'Michael Chan',
    url: 'https://reactpatterns.com/',
    likes: 7
  },
  {
    title: 'Go To Statement Considered Harmful',
    author: 'Edsger W. Dijkstra',
    url: 'http://www.u.arizona.edu/~rubinson/copyright_violations/Go_To_Considered_Harmful.html',
    likes: 5
  }
];

const nonExistingId = async () => {
  const blog = new Blog ({
    title : 'will be deleted soon',
    author : 'does not matter',
    url : 'no need for url',
    likes: 0
  });

  await blog.save();
  await blog.remove();
  return blog._id;
};

const blogsInDB = async () => {
  const blogs = await Blog.find({});
  return blogs.map(blog => blog.toJSON());
};

const removeIdFromModelBlogObjects = (blogs) => {
  return blogs.map(blog => {
    return {
      title : blog.title,
      author : blog.author,
      url : blog.url,
      likes : blog.likes
    };
  });
};

const usersInDB = async () => {
  const users = await User.find({});
  return users.map(u => u.toJSON());
};

module.exports = {
  initialBlogs,
  nonExistingId,
  blogsInDB,
  removeIdFromModelBlogObjects,
  usersInDB
};