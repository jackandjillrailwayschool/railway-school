module.exports = (sequelize) => {
  const User = sequelize.define('user', {
    email: {
      type: sequelize.Sequelize.DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    passwordHash: {
      type: sequelize.Sequelize.DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: sequelize.Sequelize.DataTypes.ENUM('Teacher', 'Principal', 'President', 'Accountant','Secretary'),
      allowNull: false
    },
    name: {
      type: sequelize.Sequelize.DataTypes.STRING,
      allowNull: true
    }
  }, {
    timestamps: true
  });

  return User;
};
