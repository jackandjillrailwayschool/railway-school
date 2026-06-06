const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Student', {
    admissionNo: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    studentId: { type: DataTypes.STRING, unique: true, allowNull: false },
    reg: { type: DataTypes.STRING, allowNull: true },
    name: { type: DataTypes.STRING, allowNull: false },
    motherTongue: { type: DataTypes.STRING, allowNull: true },
    dob: { type: DataTypes.DATEONLY, allowNull: true },
    placeOfBirth: { type: DataTypes.STRING, allowNull: true },
    nationality:        { type: DataTypes.STRING, allowNull: true },
    religionCaste:      { type: DataTypes.STRING, allowNull: true },
    aadhaarStudent: { type: DataTypes.STRING, allowNull: true },
    bloodStudent: { type: DataTypes.STRING, allowNull: true },
    pname: { type: DataTypes.STRING, allowNull: true },
    parentMob: { type: DataTypes.STRING, allowNull: true },
    occupation: { type: DataTypes.STRING, allowNull: true },
    motherAadhaar:      { type: DataTypes.STRING, allowNull: true },
fatherAadhaar:      { type: DataTypes.STRING, allowNull: true },
    isRailwayEmployee: { type: DataTypes.STRING, allowNull: true },
    addr: { type: DataTypes.TEXT, allowNull: true },
    guardianName: { type: DataTypes.STRING, allowNull: true },
    guardianAddress: { type: DataTypes.TEXT, allowNull: true },
    guardianOccupation: { type: DataTypes.STRING, allowNull: true },
    lastClass: { type: DataTypes.STRING, allowNull: true },
    nationality: {
  type: DataTypes.STRING,
  allowNull: true,
},
religionCaste: {
  type: DataTypes.STRING,
  allowNull: true,
},
motherAadhaar: {
  type: DataTypes.STRING,
  allowNull: true,
},
fatherAadhaar: {
  type: DataTypes.STRING,
  allowNull: true,
},
    prevSchool: { type: DataTypes.STRING, allowNull: true },
    tcDate: { type: DataTypes.DATEONLY, allowNull: true },
    medium: { type: DataTypes.STRING, allowNull: true },
    lang1: { type: DataTypes.STRING, allowNull: true },
    lang2: { type: DataTypes.STRING, allowNull: true },
    mark1: { type: DataTypes.STRING, allowNull: true },
    mark2: { type: DataTypes.STRING, allowNull: true },
    penNumber: { type: DataTypes.STRING, allowNull: true },
    class: { type: DataTypes.STRING, allowNull: false },
    section: { type: DataTypes.STRING, allowNull: false },
    rem: { type: DataTypes.TEXT, allowNull: true },
    jDate: { type: DataTypes.DATEONLY, allowNull: true }
  }, { tableName: 'students' });
};