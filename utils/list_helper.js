// functions for learning various operations on a given list of blogs
// none of them are connected to the backend

const _ = require('lodash');

const dummy = (blogs) => {
  return 1;
};

const totalLikes = (blogs) => {
  const reducer = (sum, item) => {
    return sum + item.likes;
  };
  return blogs.reduce(reducer, 0);
};

const favoriteBlog = (blogs) => {
  if(blogs.length === 0)
    return {};
  const maxLike = Math.max(...blogs.map(blog => blog.likes));
  const blogWithMaxLike = blogs.find(blog => blog.likes === maxLike);
  return {
    title: blogWithMaxLike.title,
    author: blogWithMaxLike.author,
    likes: blogWithMaxLike.likes
  };
};

const mostBlogs = (blogs) => {
  if(blogs.length === 0)
    return {};
  const authorWithCount = _.countBy(blogs, blog => blog.author);
  const authors = _.keys(authorWithCount);
  const blogCounts = _.values(authorWithCount);
  const maxCount = Math.max(...blogCounts);
  const maxIndex = _.indexOf(blogCounts, maxCount);
  const result = { author: authors[maxIndex], blogs: maxCount };
  return result;
};

const mostLikes = (blogs) => {
  if(blogs.length === 0){
    return {};
  }

  const blogsGroupedByAuthor = _.groupBy(blogs, blog => blog.author);
  const authors = _.keys(blogsGroupedByAuthor);
  const blogGroups = _.values(blogsGroupedByAuthor);

  const reducer = (sum, item) => {
    return sum + item.likes;
  };

  const authorTotalLikes = blogGroups.map(blogs => blogs.reduce(reducer, 0));
  const maxTotalLike = Math.max(...authorTotalLikes);
  const maxIndex = _.indexOf(authorTotalLikes, maxTotalLike);

  return {
    author: authors[maxIndex],
    likes: maxTotalLike
  };
};

module.exports = {
  dummy,
  totalLikes,
  favoriteBlog,
  mostBlogs,
  mostLikes
};