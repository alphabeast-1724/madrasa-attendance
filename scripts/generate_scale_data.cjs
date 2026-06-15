const fs = require('fs');

const CLASSES = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'];
const SECTIONS = ['A', 'B', 'C', 'D'];
const SURNAMES = ['Khan', 'Ahmed', 'Ali', 'Hassan', 'Hussain', 'Malik', 'Abbas', 'Siddiqui', 'Raza', 'Shah'];
const FIRST_NAMES = ['Abdullah', 'Hamza', 'Zaid', 'Yahya', 'Mustafa', 'Ibrahim', 'Yusuf', 'Bilal', 'Omar', 'Ali', 'Fatima', 'Ayesha', 'Zainab', 'Maryam', 'Hafsa', 'Sana', 'Khadija', 'Sara', 'Amna', 'Hina'];

function getRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateData() {
    let sql = '-- SCALE TEST SEED: 1,680 Students, 40 Classes, 40 Teachers\n';
    sql += '-- Use the cleanup script at the bottom to reverse this.\n\nBEGIN;\n\n';

    // 1. Generate 40 Classes
    CLASSES.forEach((level) => {
        SECTIONS.forEach((section) => {
            const name = "Class " + level + "-" + section;
            sql += "INSERT INTO public.classes (class_name, batch) VALUES ('" + name + "', 'STRESS-TEST-DATA');\n";
        });
    });

    sql += '\n-- Inserting Students (42 per class)\n';

    // 2. Generate Students with structured IDs: LV-SEC-XX
    CLASSES.forEach((level) => {
        SECTIONS.forEach((section) => {
            const className = "Class " + level + "-" + section;
            for (let i = 1; i <= 42; i++) {
                const id = level + "-" + section + "-" + i.toString().padStart(2, '0');
                const name = getRandom(FIRST_NAMES) + " " + getRandom(SURNAMES);
                const father = getRandom(FIRST_NAMES) + " " + getRandom(SURNAMES);
                sql += "INSERT INTO public.students (reg_no, name, father_name, class_id) \n";
                sql += "SELECT '" + id + "', '" + name + "', '" + father + "', id FROM public.classes WHERE class_name = '" + className + "' LIMIT 1;\n";
            }
        });
    });

    sql += '\n-- CLEANUP SCRIPT (RUN TO REVERSE):\n';
    sql += "-- DELETE FROM public.classes WHERE batch = 'STRESS-TEST-DATA';\n\n";
    sql += 'COMMIT;';

    fs.writeFileSync('scale_test_seed.sql', sql);
    console.log('scale_test_seed.sql generated with 1,680 students.');
}

generateData();
