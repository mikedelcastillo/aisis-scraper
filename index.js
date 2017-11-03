const request = require("request");

const AISIS_URL = "http://aisisonline.ateneo.edu/class_schedule.php";

const REG_SEMESTERS = /<s.*?e="sem".*?>([\S\s]*?)<\/s.*?>/gmi;
const REG_YEARS = /<s.*?e="year".*?>([\S\s]*?)<\/s.*?>/gmi;
const REG_DEPARTMENTS = /<s.*?e="dept".*?>([\S\s]*?)<\/s.*?>/gmi;
const REG_OPTIONS = /<o.*?e="(.*?)".*?>([\S\s]*?)<\/o.*?>/gmi;
const REG_UPDATE = />Note: Schedule as of (.*?) (.*?), (.*?)  (.*?) (.*?)</gmi;
const REG_RESULTS = /Remarks.*?tr>([\S\s]*?)<\/tr><\/table>/gmi;
const REG_ROWS = /<tr[\S\s]*?"text03">([\S\s]*?)<\/[\S\s]*?"text03">([\S\s]*?)<\/[\S\s]*?"text03">([\S\s]*?)<\/[\S\s]*?"text03">([\S\s]*?)<\/[\S\s]*?"text03">([\S\s]*?)<\/[\S\s]*?"text03">([\S\s]*?)<\/[\S\s]*?"text03">([\S\s]*?)<\/[\S\s]*?"text03">([\S\s]*?)<\/[\S\s]*?"text03">([\S\s]*?)<\/[\S\s]*?"text03">([\S\s]*?)<\/[\S\s]*?"text03">([\S\s]*?)<\/[\S\s]*?<\/tr>/gmi;

module.exports = {
  getYears(){
    return this.request()
    .then(body => {
      return body.match(REG_YEARS)
      .pop().match(REG_OPTIONS)
      .map(option => {
        let match = REG_OPTIONS.exec(option);
        REG_OPTIONS.lastIndex = 0;

        return {
          name: match[2],
          code: match[1],
          default: !!option.match(/selected/gmi)
        }
      });
    });
  },
  getSemesters(){
    return this.request()
    .then(body => {
      return body.match(REG_SEMESTERS)
      .pop().match(REG_OPTIONS)
      .map(option => {
        let match = REG_OPTIONS.exec(option);
        REG_OPTIONS.lastIndex = 0;

        return {
          name: match[2],
          code: match[1],
          default: !!option.match(/selected/gmi)
        }
      });
    });
  },
  getDepartments(){
    return this.request()
    .then(body => {
      return body.match(REG_DEPARTMENTS)
      .pop().match(REG_OPTIONS)
      .filter((e, i) => i != 0)
      .map(option => {
        let match = REG_OPTIONS.exec(option);
        REG_OPTIONS.lastIndex = 0;
        return {
          name: match[2],
          code: match[1]
        };
      });

    });
  },
  getDefaultYear(){
    return this.getYears()
    .then(array => {
      for(let i = 0; i < array.length; i++)
        if(array[i].default)
          return array[i];
    });
  },
  getDefaultSemester(){
    return this.getSemesters()
    .then(array => {
      for(let i = 0; i < array.length; i++)
        if(array[i].default)
          return array[i];
    });
  },
  getCourses(department, semester, year){
    return this.request(department, semester, year)
    .then(body => {
      let match = body.match(REG_RESULTS);

      if(!match) return [];

      let item = match.pop();

      if(!item) return [];

      let rows = item.match(REG_ROWS);

      if(!rows) return [];

      return rows.map(match => {
        match = REG_ROWS.exec(match);
        REG_ROWS.lastIndex = 0;
        return match;
      }).map(match => {
        return {
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
        }
      });
    });
  },
  getAllCurrentCourses(callback){
    let defaultYear;
    let defaultSemester;
    let departments;

    let results = [];

    this
    .getDefaultYear()
    .then(year => {
      defaultYear = year;

      console.log("Default Year: ", year);

      return this.getDefaultSemester();
    }).then(semester => {
      defaultSemester = semester;

      console.log("Default Semester: ", semester);

      return this.getDepartments();
    }).then(depts => {
      departments = depts;

      console.log("Got departments");

      return loop();
    })

    let loop = () => {
      if(!departments.length){
        callback(results);
      } else{
        let currentDept = departments.shift();

        console.log(currentDept);

        this.getCourses(
          currentDept.code,
          defaultSemester.code,
          defaultYear.code
        ).then(courses => {
          results = results.concat(courses);

          loop();
        });
      }
    };
  },
  request(department, semester, year){
    let data = department ? {
      year,
      sem: semester,
      dept: department,
      submit: "Display Class Schedule"
    } : {};

    return new Promise((success, fail) => {
      request.post({
        url: AISIS_URL,
        formData: data
      }, (err, res, body) => {
        if(err){
          fail(err);
        } else{
          success(body);
        }
      });
    });
  }
};
