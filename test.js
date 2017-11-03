const aisis = require("./index.js");

aisis.getAllCurrentCourses(courses => {
  courses.forEach(course => console.log(course));
});
