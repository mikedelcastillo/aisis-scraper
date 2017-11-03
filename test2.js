const aisis = require("./aisis.js");

aisis.getCurrentCourses(courses => {
  courses.forEach(course => {
    console.log(course.instructor);
  });
}, () => {
  console.log("something went wrong");
});
