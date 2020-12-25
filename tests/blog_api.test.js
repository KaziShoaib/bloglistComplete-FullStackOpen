//jest test files should have .test in their name
//tests the backend api

const mongoose = require('mongoose');
const supertest = require('supertest');
const bcrypt = require('bcryptjs');
const helper = require('./test_helper');
const app = require('../app');
const api = supertest(app);
const Blog = require('../models/blog');
const User = require('../models/user');


beforeEach( async () => {
  await Blog.deleteMany({});

  // we can't use for...each here
  // because for...each is a collection of functions
  // in this case all the for...each functins will have to be async
  // beforeEach itself is an async function
  // but beforeEach won't wait for the async functions inside for...each to finish
  // more on this here : "https://fullstackopen.com/en/part4/testing_the_backend#optimizing-the-before-each-function"
  for(let blog of helper.initialBlogs){
    let blogObject = new Blog(blog);
    await blogObject.save();
  }
});


describe('when there is initially some blogs saved', () => {

  test('blogs are returned as json', async () => {
    await api
      .get('/api/blogs')
      .expect(200)
      .expect('Content-Type', /application\/json/);
  });


  test('all blogs are returned', async () => {
    const response = await api.get('/api/blogs');
    expect(response.body).toHaveLength(helper.initialBlogs.length);
  });


  test('a specific blog is within the returned blogs', async () => {
    const response = await api.get('/api/blogs');
    //this operation is necessary because all the returned blogs have an id
    // but the blogs in the initialBlogs array have no id
    const returnedBlogs = helper.removeIdFromModelBlogObjects(response.body);
    expect(returnedBlogs).toContainEqual(helper.initialBlogs[0]);
  });


  test('all blogs have unique identifer id, not _id', async () => {
    const response = await api.get('/api/blogs');
    const returnedBlogs = response.body;
    returnedBlogs.forEach((blog) => {
      expect(blog.id).toBeDefined();
      expect(blog._id).not.toBeDefined();
    });
  });

});


describe('addition of a new blog', () => {

  test('succeeds with valid data', async () => {
    const newBlog = {
      title: 'First class tests',
      author: 'Robert C. Martin',
      url: 'http://blog.cleancoder.com/uncle-bob/2017/05/05/TestDefinitions.html',
      likes: 10
    };

    await api
      .post('/api/blogs')
      .send(newBlog)
      .expect(201)
      .expect('Content-Type', /application\/json/);

    const returnedBlogs = await helper.blogsInDB();
    //this operation is necessary because all the returned blogs have an id
    // but the newBllog object has no id
    const blogsAtEnd = helper.removeIdFromModelBlogObjects(returnedBlogs);
    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length + 1);
    expect(blogsAtEnd).toContainEqual(newBlog);
  });


  test('a blog with no likes is saved with zero likes', async () => {
    const newBlog = {
      title:'TDD harms architecture',
      author:'Robert C. Martin',
      url:'http://blog.cleancoder.com/uncle-bob/2017/05/05/TestDefinitions.html'
    };

    await api
      .post('/api/blogs')
      .send(newBlog)
      .expect(201)
      .expect('Content-Type',/application\/json/);

    const returnedBlogs = await helper.blogsInDB();
    //this operation is necessary because all the returned blogs have an id
    // but the newBllog object has no id
    const blogsAtEnd = helper.removeIdFromModelBlogObjects(returnedBlogs);
    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length + 1);
    expect(blogsAtEnd).toContainEqual({
      title:newBlog.title,
      author:newBlog.author,
      url: newBlog.url,
      likes: 0
    });
  });

  test('a blog with no title and url is not saved with statuscode 400', async () => {
    const newBlog = {
      author: 'Jafar Sadik',
      likes: 3
    };

    await api
      .post('/api/blogs')
      .send(newBlog)
      .expect(400);

    const blogsAtEnd = await helper.blogsInDB();
    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length);
  });

});


describe('deletion of a blog', () => {

  test('succeeds with statuscode 204 if id is valid', async () => {
    const blogsAtStart = await helper.blogsInDB();
    const blogToDelete = blogsAtStart[0];
    //console.log(blogToDelete.id);
    await api
      .delete(`/api/blogs/${blogToDelete.id}`)
      .expect(204);

    const blogsAtEnd = await helper.blogsInDB();
    expect(blogsAtEnd.length).toBe(blogsAtStart.length - 1);
    expect(blogsAtEnd).not.toContainEqual(blogToDelete);
  });

  test('fails with statuscode 400 if id is not valid', async () => {
    const invalidId = '5a3d5da59070081a82a3445';
    await api
      .delete(`/api/blogs/${invalidId}`)
      .expect(400);
  });
});

describe('editing an existing blog', () => {

  test('succeeds in updating likes of an existing blog if id is valid', async () => {
    const blogsAtStart = await helper.blogsInDB();
    const blogToEdit = blogsAtStart[0];
    const edits = {
      likes : blogToEdit.likes + 1
    };

    const response = await api.put(`/api/blogs/${blogToEdit.id}`).send(edits);
    // the object returned by the router is inside response.body
    const editedBlog = response.body;
    expect(editedBlog.title).toBe(blogToEdit.title);
    expect(editedBlog.author).toBe(blogToEdit.author);
    expect(editedBlog.url).toBe(blogToEdit.url);
    expect(editedBlog.likes).toBe(blogToEdit.likes + 1);
  });

});


describe('whene there is initially one user in db', () => {


  beforeEach(async () => {
    await User.deleteMany({});
    const passwordHash = await bcrypt.hash('sekret',10);
    const user = new User({
      username:'root',
      name:'admin',
      passwordHash
    });
    await user.save();
  });


  test.only('creation succeeds with fresh username', async () => {
    const usersAtStart = await helper.usersInDB();

    const newUser = {
      username: 'mluukkai',
      name: 'Matti Luukkainen',
      password: 'salainen',
    };

    await api
      .post('/api/users')
      .send(newUser)
      .expect(200)
      .expect('Content-Type', /application\/json/);

    const usersAtEnd = await helper.usersInDB();
    expect(usersAtEnd).toHaveLength(usersAtStart.length + 1);

    const usernames = usersAtEnd.map(u => u.username);
    expect(usernames).toContain(newUser.username);
  });

  test.only('creation fails with proper statuscode and message if username is already taken', async () => {
    const usersAtStart = await helper.usersInDB();

    const newUser = {
      username: 'root',
      name: 'superUser',
      password: 'salainen'
    };

    const result = await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/);

    const usersAtEnd = await helper.usersInDB();
    expect(usersAtEnd).toHaveLength(usersAtStart.length);

    expect(result.body.error).toContain('`username` to be unique');
  });


  test.only('creation fails with proper statuscode and message if password is smaller than minimum length', async () => {
    const usersAtStart = await helper.usersInDB();

    const newUser = {
      'username':'jafarAhamed',
      'password': 'p',
      'name': 'test'
    };

    //this error is handled in the users controller
    //not in the errorHandler middleware
    const result = await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/);

    expect(result.body.error).toBe('password must be at least 3 characters long');

    const usersAtEnd = await helper.usersInDB();
    expect(usersAtEnd).toHaveLength(usersAtStart.length);
  });
});


afterAll(() => {
  mongoose.connection.close();
});
