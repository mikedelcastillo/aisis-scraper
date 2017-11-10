const aisis = require("./aisis.js");
const mysql = require("mysql");

let scrapeAisis = (success = () => {}, fail = () => {}) => {
  let connection = mysql.createConnection({
    host: "mikedc.io",
    user: "mikedcio_aisis",
    password: "aisistest",
    database: "mikedcio_aisis",
    multipleStatements: true
  });

  connection.connect(err => {
    if(err){
      fail();
      return;
    }

    console.log("connected to db");

    aisis.getCurrentCourses(courses => {
      let sqlValues = [];

      courses.forEach(course => {
        let id = course.code.replace(/\ /gmi, "").toUpperCase();
        id += course.section.replace(/\ /gmi, "").toUpperCase();
        let values = `("${id}", "${course.code}", "${course.section}",
        "${course.units}", "${course.title}", "${course.time}",
        "${course.room}", "${course.instructor}", "${course.free}",
        "${course.language}", "${course.level}", "${course.remarks}",
        "${course.dateUpdated}", "${course.department.code}", "${course.department.name}",
        "${course.year.code}", "${course.year.name}", "${course.semester.code}",
        "${course.semester.name}")`;

        sqlValues.push(values);
      });

      let values = sqlValues.join(",");

      let sql = `
        TRUNCATE TABLE courses;
        INSERT INTO courses
          (id, course_code, section,
          units, title, time,
          room, instructor, free,
          language, level, remarks,
          date_updated, dept_code, dept_name,
          year_code, year_name, sem_code,
          sem_name)
        VALUES ${values}
        ON DUPLICATE KEY UPDATE
          course_code = VALUES(course_code),
          section = VALUES(section),
          units = VALUES(units),
          title = VALUES(title),
          time = VALUES(time),
          room = VALUES(room),
          instructor = VALUES(instructor),
          free = VALUES(free),
          language = VALUES(language),
          level = VALUES(level),
          remarks = VALUES(remarks),
          date_updated = VALUES(date_updated),
          dept_code = VALUES(dept_code),
          dept_name = VALUES(dept_name),
          year_code = VALUES(year_code),
          year_name = VALUES(year_name),
          sem_name = VALUES(sem_name),
          sem_code = VALUES(sem_code);
      `;

      sql = sql.replace(/[\ \t \n]{1,}/gmi, " ");

      console.log("Uploading to database.");

      connection.query(sql, (error, results, fields) => {
        if(error){
          console.log("There was an error");
          fail();
        } else{
          console.log("Done");
          connection.end();
          success(courses);
        }
      });

    }, () => {
      console.log("ERROR: Something went wrong.");
      connection.end();
      fail();
    });
  });
};

module.exports = scrapeAisis;
