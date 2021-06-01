const authConfig = require('../config/auth');
const { generateUserToken, generateUserRefreshToken } = require('../src/auth');
const { User } = require('../src/models');

const createUser = (userData) => {
  const user = User.build({
    email: userData.email,
    firstName: userData.firstName,
    lastName: userData.lastName,
  });
  user.setPassword(userData.password);
  return user.save();
};

module.exports = {
  createUser,

  createUserWithTokens: async (userData) => {
    const user = await createUser(userData);
    const accessToken = await generateUserToken(
      user,
      authConfig.accessToken.secret,
      authConfig.accessToken.lifetime,
    );
    const refreshToken = await generateUserRefreshToken(user, accessToken);

    return { user, accessToken, refreshToken };
  },
};
