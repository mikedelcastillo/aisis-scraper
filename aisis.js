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
  silent: false,
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
      formData: data,
      timeout: 10000 * 60
    }, (err, res, body) => {
      if(err){
        //if(!this.silent) console.log("REQUEST: Failed request");
        fail(err, res);
      } else{
        //if(!this.silent) console.log("REQUEST: Successful request");
        success(body);
      }
    });
  },

  getYears(success, fail){
    this.request(null, null, null, body => {
      REG_YEARS.lastIndex = 0;
      let html = REG_YEARS.exec(body);

      if(!html){ fail(); return; }
      html = html[0];

      let years = [];

      REG_OPTIONS.lastIndex = 0;
      for(let match; match = REG_OPTIONS.exec(html);){
        years.push({
          name: match[2].trim(),
          code: match[1].trim(),
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
      if(!html){ fail(); return; }
      html = html[0];

      let semesters = [];

      REG_OPTIONS.lastIndex = 0;
      for(let match; match = REG_OPTIONS.exec(html);){
        semesters.push({
          name: match[2].trim(),
          code: match[1].trim(),
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
      if(!html){ fail(); return; }
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
      REG_UPDATE.lastIndex = 0;
      let updateMatch = REG_UPDATE.exec(body);
      let dateUpdated = 0;

      if(updateMatch){
        let parsedTime = updateMatch[4].trim().split(":").map((string, i) => {
          let n = Number(string);

          if(i == 0){
            if(updateMatch[5].trim() == "P.M."){
              n += 12;
            } else{
              if(n == 12) n = 0;
            }
          }

          return n < 10 ? "0" + n : n;
        }).join(":");
        let dateString = `${updateMatch[1].trim()} ${updateMatch[2].trim()}, ${updateMatch[3].trim()} ${parsedTime}:00`;
        dateUpdated = new Date(dateString).getTime() / 1000;
      }


      REG_RESULTS.lastIndex = 0;
      let html = REG_RESULTS.exec(body);
      if(!html){ success([]); return; }
      html = html[0];

      let courses = [];

      REG_ROWS.lastIndex = 0;
      for(let match; match = REG_ROWS.exec(html);){
        courses.push({
          code: match[1].trim(),
          section: match[2].trim(),
          units: Number(match[4].trim()),
          title: match[3].trim(),
          time: match[5].trim(),
          room: match[6].trim(),
          instructor: match[7].trim(),
          free: Number(match[8].trim()),
          language: match[9].trim(),
          level: match[10].trim(),
          remarks: match[11].replace(/[\r\n\~]/gmi, "").trim(),
          dateUpdated: dateUpdated
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

    let totalDepartments = 1;
    let loadedDepartments = 0;

    let getNextDepartment = () => {
      if(currentDepartments.length){
        let currentDepartment = currentDepartments.shift();
        this.getCoursesFromDepartment(
          currentDepartment.code,
          currentSemester.code,
          currentYear.code,
          courses => {
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
            loadedDepartments++;

            console.log(Number((loadedDepartments/totalDepartments) * 100).toFixed(2) + "%");
            if(loadedDepartments == totalDepartments) success(currentCourses);
          },
          fail
        );
      }
    };

    this.getDefaultYear(year => {
      currentYear = year;
      console.log("Current Year: ", currentYear);

      this.getDefaultSemester(semester => {
        currentSemester = semester;
        console.log("Current Semester: ", currentSemester);

        this.getDepartments(departments => {
          currentDepartments = departments;
          totalDepartments = departments.length;
          console.log("Received current departments");

          for(let i = 0; i < 10; i++) getNextDepartment();
        }, fail);
      }, fail);
    }, fail);
  }
};

module.exports = aisis;
