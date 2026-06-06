const db = require('../models');

exports.create = async (req, res) => {
    try {
        console.log("Saving Student Data:", req.body);
        
        // Create student with the data provided
        const student = await db.Student.create(req.body);
        
        res.status(201).json({
            message: "Student Registered Successfully",
            data: student
        });
    } catch (error) {
        console.error("DETAILED DATABASE ERROR:", error);
        res.status(400).json({ 
            message: "Could not save student. Check if Student ID is unique.",
            error: error.message 
        });
    }
};
