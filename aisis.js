const request = require("request");

const AISIS_URL = "http://aisisonline.ateneo.edu/class_schedule.php";

const REG_SEMESTERS = /<s.*?e="sem".*?>([\S\s]*?)<\/s.*?>/gmi;
const REG_YEARS = /<s.*?e="year".*?>([\S\s]*?)<\/s.*?>/gmi;
const REG_DEPARTMENTS = /<s.*?e="dept".*?>([\S\s]*?)<\/s.*?>/gmi;
const REG_OPTIONS = /<o.*?e="(.*?)".*?>([\S\s]*?)<\/o.*?>/gmi;
const REG_UPDATE = />Note: Schedule as of (.*?) (.*?), (.*?)  (.*?) (.*?)</gmi;
const REG_RESULTS = /Remarks.*?tr>([\S\s]*?)<\/tr><\/table>/gmi;
const REG_ROWS = /<tr[\S\s]*?"text03">([\S\s]*?)<\/[\S\s]*?"text03">([\S\s]*?)<\/[\S\s]*?"text03">([\S\s]*?)<\/[\S\s]*?"text03">([\S\s]*?)<\/[\S\s]*?"text03">([\S\s]*?)<\/[\S\s]*?"text03">([\S\s]*?)<\/[\S\s]*?"text03">([\S\s]*?)<\/[\S\s]*?"text03">([\S\s]*?)<\/[\S\s]*?"text03">([\S\s]*?)<\/[\S\s]*?"text03">([\S\s]*?)<\/[\S\s]*?"text03">([\S\s]*?)<\/[\S\s]*?<\/tr>/gmi;

let aisis = {

  request(deptCode, semCode, yearCode, success, fail){
    let blank = deptCode == null || semCode == null || yearCode == null;

    let data = blank ? {} : {
      year: yearCode,
      sem: semCode,
      dept: deptCode,
      submit: "Display Class Schedule"
    };

    let method = blank ? "get" : "post";

    request[method]({
      url: AISIS_URL,
      formData: data
    }, (err, res, body) => {
      if(err){
        fail(err, res);
      } else{
        success(body);
      }
    });
  },

  getYears(success, fail){
    this.request(null, null, null, body => {
      REG_YEARS.lastIndex = 0;
      let html = REG_YEARS.exec(body);
      if(!html){ success([]); return; }
      html = html[0];

      let years = [];

      REG_OPTIONS.lastIndex = 0;
      for(let match; match = REG_OPTIONS.exec(html);){
        years.push({
          name: match[2],
          code: match[1],
          default: !!match[0].match(/selected/gmi)
        });
      }

      success(years);

    }, fail);
  },

  getSemesters(success, fail){
    this.request(null, null, null, body => {
      REG_SEMESTERS.lastIndex = 0;
      let html = REG_SEMESTERS.exec(body);
      if(!html){ success([]); return; }
      html = html[0];

      let semesters = [];

      REG_OPTIONS.lastIndex = 0;
      for(let match; match = REG_OPTIONS.exec(html);){
        semesters.push({
          name: match[2],
          code: match[1],
          default: !!match[0].match(/selected/gmi)
        });
      }

      success(semesters);

    }, fail);
  },

  getDepartments(success, fail){
    this.request(null, null, null, body => {
      REG_DEPARTMENTS.lastIndex = 0;
      let html = REG_DEPARTMENTS.exec(body);
      if(!html){ success([]); return; }
      html = html[0];

      let departments = [];

      REG_OPTIONS.lastIndex = 0;
      for(let match; match = REG_OPTIONS.exec(html);){
        departments.push({
          name: match[2],
          code: match[1]
        });
      }

      departments.shift();

      success(departments);

    }, fail);
  },

  getDefaultYear(success, fail){
    this.getYears(years => success(years.find(year => year.default)), fail);
  },

  getDefaultSemester(success, fail){
    this.getSemesters(semesters => success(semesters.find(semester => semester.default)), fail);
  },

  getCoursesFromDepartment(deptCode, semCode, yearCode, success, fail){
    this.request(deptCode, semCode, yearCode, body => {
      REG_RESULTS.lastIndex = 0;
      let html = REG_RESULTS.exec(body);
      if(!html){ success([]); return; }
      html = html[0];

      let courses = [];

      REG_ROWS.lastIndex = 0;
      for(let match; match = REG_ROWS.exec(html);){
        courses.push({
          code: match[1],
          section: match[2],
          units: Number(match[4]),
          title: match[3],
          time: match[5],
          room: match[6],
          instructor: match[7],
          free: Number(match[8]),
          language: match[9],
          level: match[10],
          remarks: match[11].replace("\r", "")
        });
      }

      success(courses);
    }, fail);
  },

  getCurrentCourses(success, fail){
    let currentYear;
    let currentSemester;
    let currentDepartments = [];
    let currentCourses = [];

    let getNextDepartment = () => {
      if(!currentDepartments.length){
        success(currentCourses);
      } else{
        let currentDepartment = currentDepartments.shift();
        this.getCoursesFromDepartment(
          currentDepartment.code,
          currentSemester.code,
          currentYear.code,
          courses => {
            console.log(currentDepartment);
            currentCourses = currentCourses.concat(
              courses
              .map(course => {
                course.department = currentDepartment;
                course.year = currentYear;
                course.semester = currentSemester;

                return course;
              })
            );

            getNextDepartment();
          },
          fail
        );
      }
    };

    this.getDefaultYear(year => {
      currentYear = year;
      console.log(currentYear);

      this.getDefaultSemester(semester => {
        currentSemester = semester;
        console.log(currentSemester);

        this.getDepartments(departments => {
          currentDepartments = departments;
          console.log(currentDepartments);

          getNextDepartment();
        }, fail);
      }, fail);
    }, fail);
  }
};

module.exports = aisis;
