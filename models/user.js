const mongoose = require('mongoose');
//for unique username
const uniqueValidator = require('mongoose-unique-validator');

const userSchema = new mongoose.Schema({
  username : {
    type: String,
    required: true,
    minlength: 3,
    unique: true
  },
  name : String,
  passwordHash:String,
  blogs : [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Blog'
    }
  ]
});

//the unique validator has to be plugged in with the schema
userSchema.plugin(uniqueValidator);

userSchema.set('toJSON', {
  transform : (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
    //we also don't want to display the passwordHash publically
    delete returnedObject.passwordHash;
  }
});

const User = mongoose.model('User', userSchema);
module.exports = User;