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
  await User.deleteMany({});

  //creating a new user for testing
  const passwordHash = await bcrypt.hash(helper.initialUser.password, 10);
  const user = new User({
    username: helper.initialUser.username,
    name: helper.initialUser.name,
    passwordHash
  });
  await user.save();

  // we can't use for...each here
  // because for...each is a collection of functions
  // in this case all the for...each functins will have to be async
  // beforeEach itself is an async function
  // but beforeEach won't wait for the async functions inside for...each to finish
  // more on this here : "https://fullstackopen.com/en/part4/testing_the_backend#optimizing-the-before-each-function"
  for(let blog of helper.initialBlogs){
    //adding the saved user's id as the creator of the blog
    let blogObject = new Blog({
      ...blog,
      user: user._id
    });
    await blogObject.save();
    //adding the saved blog's id to user's blogs field
    user.blogs = user.blogs.concat(blogObject._id);
    await user.save();
  }
});


const loginAndGetAuthHeader = async (user = helper.initialUser) => {
  const loginResponse = await api
    .post('/api/login')
    .send(user);
  const token = loginResponse.body.token;
  const authHeader = { 'Authorization' : `bearer ${token}` };
  return authHeader;
};


describe('whene there is initially one user in db', () => {

  test('creation succeeds with fresh username', async () => {
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

  test('creation fails with proper statuscode and message if username is already taken', async () => {
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


  test('creation fails with proper statuscode and message if password is smaller than minimum length', async () => {
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


  test('succeeds to log in with correct id and password', async () => {
    const loginResponse = await api
      .post('/api/login')
      .send(helper.initialUser)
      .expect(200);

    expect(loginResponse.body.username).toBe(helper.initialUser.username);
    expect(loginResponse.body.token).toBeDefined();
  });

  test('fails to log in with incorrect password', async () => {
    const userWithWrongPassword = { ...helper.initialUser, password:'wrong password' };

    const loginResponse = await api
      .post('/api/login')
      .send(userWithWrongPassword)
      .expect(401)
      .expect('Content-Type', /application\/json/);

    //this error is coming from the login controller not the middleware
    expect(loginResponse.body.error).toBe('invalid username or password');
    expect(loginResponse.body.token).not.toBeDefined();
  });
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
    const titles = response.body.map(b => b.title);
    expect(titles).toContain(helper.initialBlogs[1].title);
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
    // logging in a user before adding a new blog

    //the function logs in a user and creates the Authorization header object
    const authHeader = await loginAndGetAuthHeader();

    const newBlog = {
      title: 'First class tests',
      author: 'Robert C. Martin',
      url: 'http://blog.cleancoder.com/uncle-bob/2017/05/05/TestDefinitions.html',
      likes: 10
    };

    await api
      .post('/api/blogs')
      .set(authHeader)
      .send(newBlog)
      .expect(201)
      .expect('Content-Type', /application\/json/);

    const blogsAtEnd = await helper.blogsInDB();
    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length + 1);
    const titles = blogsAtEnd.map(b => b.title);
    expect(titles).toContain(newBlog.title);
  });


  test('a blog with no likes is saved with zero likes', async () => {
    //logging in a user before posting a new blog

    //the function logs in a user and creates the Authorization header object
    const authHeader = await loginAndGetAuthHeader();

    const newBlog = {
      title:'TDD harms architecture',
      author:'Robert C. Martin',
      url:'http://blog.cleancoder.com/uncle-bob/2017/05/05/TestDefinitions.html'
    };

    await api
      .post('/api/blogs')
      .set(authHeader)
      .send(newBlog)
      .expect(201)
      .expect('Content-Type',/application\/json/);

    const blogsAtEnd = await helper.blogsInDB();
    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length + 1);
    const savedBlog = blogsAtEnd.find(blog => blog.title === newBlog.title);
    expect(savedBlog.likes).toBe(0);
  });

  test('a blog with no title and url is not saved with statuscode 400', async () => {
    //logging in a user before trying to post a new blog
    //the function logs in a user and creates the Authorization header object
    const authHeader = await loginAndGetAuthHeader();

    const newBlog = {
      author: 'Jafar Sadik',
      likes: 3
    };

    await api
      .post('/api/blogs')
      .set(authHeader)
      .send(newBlog)
      .expect(400);

    const blogsAtEnd = await helper.blogsInDB();
    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length);
  });

  test('saving a blog fails with statuscode 401 if no token is provided', async () => {
    //no user is logged in
    const newBlog = {
      'title':'How to read faster',
      'author':'Jamal Ahmed',
      'url':'http://www.example.com',
      'likes':3
    };

    //missing authorization header errors are handled by the errorHandler middleware
    const result = await api
      .post('/api/blogs')
      .send(newBlog)
      .expect(401)
      .expect('Content-Type',/application\/json/);

    expect(result.body.error).toBe('invalid token');

    const blogsAtEnd = await helper.blogsInDB();
    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length);
  });
});


describe('deletion of a blog', () => {

  test('succeeds with statuscode 204 if id is valid', async () => {
    const blogsAtStart = await helper.blogsInDB();
    const blogToDelete = blogsAtStart[0];

    //the function logs in a user and creates the Authorization header object
    const authHeader = await loginAndGetAuthHeader();

    await api
      .delete(`/api/blogs/${blogToDelete.id}`)
      .set(authHeader)
      .expect(204);

    const blogsAtEnd = await helper.blogsInDB();
    expect(blogsAtEnd).toHaveLength(blogsAtStart.length - 1);
    expect(blogsAtEnd).not.toContainEqual(blogToDelete);
  });

  test('fails with statuscode 400 if id is not valid', async () => {
    const invalidId = '5a3d5da59070081a82a3445';

    //logging in a user before trying to delete the blog
    const authHeader = await loginAndGetAuthHeader();
    await api
      .delete(`/api/blogs/${invalidId}`)
      .set(authHeader)
      .expect(400);

    const blogsAtEnd = await helper.blogsInDB();
    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length);
  });


  test('fails with statucode 401 if no token is provided', async () => {
    const blogsAtStart = await helper.blogsInDB();
    const blogToDelete = blogsAtStart[0];

    //trying to delete a blog without logging in a user
    const result = await api
      .delete(`/api/blogs/${blogToDelete.id}`)
      .expect(401)
      .expect('Content-Type',/application\/json/);

    expect(result.body.error).toBe('invalid token');
    const blogsAtEnd = await helper.blogsInDB();
    expect(blogsAtEnd).toHaveLength(blogsAtStart.length);
    expect(blogsAtEnd).toContainEqual(blogToDelete);
  });


  test('fails with a statuscode of 401 if someone else tries to delete a blog', async () => {
    const freshUser = {
      username:'test',
      name:'test user',
      password: 'testpassword'
    };
    const passwordHash = await bcrypt.hash(freshUser.password, 10);
    const userObject = new User({
      username: freshUser.username,
      name: freshUser.name,
      passwordHash
    });
    await userObject.save();

    //logging in this newly created user
    const authHeader = await loginAndGetAuthHeader(freshUser);

    const blogsAtStart = await helper.blogsInDB();
    const blogToDelete = blogsAtStart[0];

    //trying to delete a blog not created by this freshUser
    const result = await api
      .delete(`/api/blogs/${blogToDelete.id}`)
      .set(authHeader)
      .expect(401)
      .expect('Content-Type',/application\/json/);

    expect(result.body.error).toBe('a blog can only be deleted by it\'s creator');

    const blogsAtEnd = await helper.blogsInDB();
    expect(blogsAtEnd).toHaveLength(blogsAtStart.length);
    expect(blogsAtEnd).toContainEqual(blogToDelete);
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


afterAll(() => {
  mongoose.connection.close();
});
