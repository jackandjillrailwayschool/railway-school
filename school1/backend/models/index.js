const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 4000, // TiDB uses port 4000
  dialect: 'mysql',
  logging: false,
  dialectOptions: {
    ssl: {
      rejectUnauthorized: true // Required for TiDB Cloud
    }
  }
});

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.User = require('./user')(sequelize);
db.Student = require('./student')(sequelize);
db.Mark = require('./mark')(sequelize);
db.Fee = require('./fee')(sequelize);
db.Attendance = require('./Attendance')(sequelize, Sequelize.DataTypes);
db.Remark = require('./Remark')(sequelize, Sequelize.DataTypes);

// Associations
db.Student.hasMany(db.Mark, { foreignKey: 'studentReg', sourceKey: 'admissionNo' });
db.Mark.belongsTo(db.Student, { foreignKey: 'studentReg', targetKey: 'admissionNo' });
db.Student.hasMany(db.Fee, { foreignKey: 'studentReg', sourceKey: 'admissionNo' });
db.Fee.belongsTo(db.Student, { foreignKey: 'studentReg', targetKey: 'admissionNo' });

module.exports = db;