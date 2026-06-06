module.exports = (sequelize, DataTypes) => {
    const Attendance = sequelize.define('Attendance', {
        studentId:   { type: DataTypes.STRING, allowNull: false },
        admissionNo: { type: DataTypes.INTEGER },
        name:        { type: DataTypes.STRING },
        class:       { type: DataTypes.STRING, allowNull: false },
        section:     { type: DataTypes.STRING, allowNull: false },
        date:        { type: DataTypes.STRING, allowNull: false },
        session:     { type: DataTypes.STRING, allowNull: false },
        status:      { type: DataTypes.STRING, allowNull: false, defaultValue: 'Absent' }
    }, {
        tableName: 'attendance',
        timestamps: true
    });

    return Attendance;
};