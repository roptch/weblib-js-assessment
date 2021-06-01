module.exports = {
  // signup
  userRegisterSchema: {
    email: {
      in: ['body'],
      isEmail: true,
      normalizeEmail: true,
    },
    password: {
      in: ['body'],
      isLength: {
        errorMessage: 'Password should be at least 4 characters long',
        options: {
          min: 4,
        },
      },
    },
    firstName: {
      in: ['body'],
      notEmpty: true,
    },
    lastName: {
      in: ['body'],
      notEmpty: true,
    },
  },

  // login
  userLoginSchema: {
    email: {
      in: ['body'],
      isEmail: true,
      normalizeEmail: true,
    },
    password: {
      in: ['body'],
      notEmpty: true,
    },
  },

  // refreshtoken
  userRefreshTokenSchema: {
    refreshToken: {
      in: ['cookies'],
      notEmpty: true,
    },
  },
};
