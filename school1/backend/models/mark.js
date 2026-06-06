const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  return sequelize.define('Mark', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    studentReg: { type: DataTypes.INTEGER, allowNull: false }, // Will link to admissionNo
    exam: { type: DataTypes.STRING },
    marks: { type: DataTypes.JSON },
    total: { type: DataTypes.INTEGER },
    grade: { type: DataTypes.STRING }
  }, { tableName: 'marks' });
};