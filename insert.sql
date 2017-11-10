INSERT INTO courses
  (id,
  course_code,
  section,
  units,
  title,
  time,
  room,
  instructor,
  free,
  language,
  level,
  remarks,
  date_updated,
  dept_code,
  dept_name,
  year_code,
  year_name,
  sem_name,
  sem_code)
VALUES
  (
# values here
  )
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
sem_code = VALUES(sem_code)
