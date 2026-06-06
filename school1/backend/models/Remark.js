const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    return sequelize.define('Remark', {
        id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        studentId:   { type: DataTypes.STRING, allowNull: false },
        admissionNo: { type: DataTypes.INTEGER, allowNull: false },
        remark:      { type: DataTypes.TEXT, allowNull: false },
        addedBy:     { type: DataTypes.STRING, allowNull: false },  // teacher name
        role:        { type: DataTypes.STRING, allowNull: false },  // Teacher / Principal
        date:        { type: DataTypes.DATEONLY, allowNull: false },
    }, { tableName: 'remarks' });
};