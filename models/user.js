// models/user.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
   password: String,
  city: String,
  useWeather: Boolean
});

// Add a static method to authenticate users
userSchema.statics.authenticate = async function (username, password) {
  const user = await this.findOne({ username });

  console.log('Entered Password:', password);
  console.log('Stored Hashed Password:', user ? user.password : 'User not found');

  if (user && bcrypt.compareSync(password, user.password)) {
    return user;
  }

  return null;
};

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
