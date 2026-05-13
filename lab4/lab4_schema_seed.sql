-- ============================================================
-- LAB4: 数据库实现脚本（PostgreSQL 16）
-- 内容：DDL + 关键约束 + 索引（不含测试数据）
-- ============================================================

BEGIN;

-- 可重复执行：按依赖顺序删除
DROP TABLE IF EXISTS QueryRecord CASCADE;
DROP TABLE IF EXISTS EventParticipation CASCADE;
DROP TABLE IF EXISTS Enrollment CASCADE;
DROP TABLE IF EXISTS Teaching CASCADE;
DROP TABLE IF EXISTS Event CASCADE;
DROP TABLE IF EXISTS Course CASCADE;
DROP TABLE IF EXISTS SysUser CASCADE;
DROP TABLE IF EXISTS Teacher CASCADE;
DROP TABLE IF EXISTS Student CASCADE;
DROP TABLE IF EXISTS Department CASCADE;
DROP TABLE IF EXISTS Location CASCADE;
DROP TABLE IF EXISTS Building CASCADE;
DROP TABLE IF EXISTS Campus CASCADE;
DROP TABLE IF EXISTS People CASCADE;

-- -----------------------------------------------
-- 模块1：空间地理
-- -----------------------------------------------
CREATE TABLE Campus (
    campus_id   SERIAL       PRIMARY KEY,
    campus_name VARCHAR(50)  NOT NULL UNIQUE,
    address     VARCHAR(200) NOT NULL
);

CREATE TABLE Building (
    building_id    SERIAL        PRIMARY KEY,
    building_name  VARCHAR(100)  NOT NULL,
    campus_id      INT           NOT NULL
        REFERENCES Campus(campus_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    building_type  VARCHAR(20)   NOT NULL
        CHECK (building_type IN (
            '教学楼','宿舍楼','食堂楼','图书馆',
            '行政楼','实验楼','体育设施','医疗卫生','其他'
        )),
    description    TEXT,
    UNIQUE (building_name, campus_id)
);

CREATE TABLE Location (
    location_id    SERIAL        PRIMARY KEY,
    location_name  VARCHAR(100)  NOT NULL,
    building_id    INT           NOT NULL
        REFERENCES Building(building_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    facility_type  VARCHAR(20)   NOT NULL
        CHECK (facility_type IN (
            '教室','食堂','咖啡店','自习室','图书馆',
            '实验室','运动场地','办公室','医务室','其他'
        )),
    description    TEXT,
    open_time      VARCHAR(100),
    UNIQUE (location_name, building_id)
);

-- -----------------------------------------------
-- 模块2：人员基表
-- -----------------------------------------------
CREATE TABLE People (
    people_id  SERIAL        PRIMARY KEY,
    name       VARCHAR(50)   NOT NULL,
    gender     CHAR(1)       NOT NULL CHECK (gender IN ('M', 'F', 'O')),
    phone      VARCHAR(20)   UNIQUE,
    email      VARCHAR(100)  UNIQUE
);

-- -----------------------------------------------
-- 模块3：院系（manager_id 可推迟约束）
-- -----------------------------------------------
CREATE TABLE Department (
    dep_id               SERIAL        PRIMARY KEY,
    dep_name             VARCHAR(100)  NOT NULL UNIQUE,
    contact_info         VARCHAR(200),
    office_location_id   INT
        REFERENCES Location(location_id) ON DELETE SET NULL ON UPDATE CASCADE,
    manager_id           INT
        REFERENCES People(people_id) ON DELETE SET NULL ON UPDATE CASCADE
        DEFERRABLE INITIALLY DEFERRED,
    description          TEXT
);

-- -----------------------------------------------
-- 模块4：学生 / 教师扩展
-- -----------------------------------------------
CREATE TABLE Student (
    people_id    INT           PRIMARY KEY
        REFERENCES People(people_id) ON DELETE CASCADE ON UPDATE CASCADE,
    student_no   VARCHAR(20)   NOT NULL UNIQUE,
    grade        VARCHAR(10)   NOT NULL
        CHECK (grade IN (
            '大一','大二','大三','大四',
            '研一','研二','研三',
            '博一','博二','博三','博四','其他'
        )),
    major        VARCHAR(100)  NOT NULL,
    dep_id       INT           NOT NULL
        REFERENCES Department(dep_id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE Teacher (
    people_id    INT           PRIMARY KEY
        REFERENCES People(people_id) ON DELETE CASCADE ON UPDATE CASCADE,
    staff_no     VARCHAR(20)   NOT NULL UNIQUE,
    title        VARCHAR(20)   NOT NULL
        CHECK (title IN (
            '助教','讲师','副教授','教授','研究员','特聘教授','其他'
        )),
    dept_id      INT           NOT NULL
        REFERENCES Department(dep_id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- -----------------------------------------------
-- 模块5：系统用户
-- -----------------------------------------------
CREATE TABLE SysUser (
    user_id               SERIAL        PRIMARY KEY,
    people_id             INT           NOT NULL UNIQUE
        REFERENCES People(people_id) ON DELETE CASCADE ON UPDATE CASCADE,
    username              VARCHAR(50)   NOT NULL UNIQUE,
    password_hash         VARCHAR(255)  NOT NULL,
    role_type             VARCHAR(10)   NOT NULL
        CHECK (role_type IN ('student', 'teacher', 'admin')),
    verification_status   VARCHAR(10)   NOT NULL DEFAULT 'pending'
        CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    dep_id                INT
        REFERENCES Department(dep_id) ON DELETE SET NULL ON UPDATE CASCADE,
    created_at            TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------
-- 模块6：课程与关系
-- -----------------------------------------------
CREATE TABLE Course (
    course_id     SERIAL        PRIMARY KEY,
    course_name   VARCHAR(200)  NOT NULL,
    dep_id        INT           NOT NULL
        REFERENCES Department(dep_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    description   TEXT,
    UNIQUE (course_name, dep_id)
);

CREATE TABLE Teaching (
    teacher_id    INT       NOT NULL
        REFERENCES Teacher(people_id) ON DELETE CASCADE ON UPDATE CASCADE,
    course_id     INT       NOT NULL
        REFERENCES Course(course_id) ON DELETE CASCADE ON UPDATE CASCADE,
    semester      CHAR(11)  NOT NULL
        CHECK (semester ~ '^\d{4}-\d{4}-[12]$'),
    PRIMARY KEY (teacher_id, course_id, semester)
);

CREATE TABLE Enrollment (
    student_id    INT           NOT NULL
        REFERENCES Student(people_id) ON DELETE CASCADE ON UPDATE CASCADE,
    course_id     INT           NOT NULL
        REFERENCES Course(course_id) ON DELETE CASCADE ON UPDATE CASCADE,
    semester      CHAR(11)      NOT NULL
        CHECK (semester ~ '^\d{4}-\d{4}-[12]$'),
    grade         NUMERIC(5,2)
        CHECK (grade IS NULL OR (grade >= 0 AND grade <= 100)),
    PRIMARY KEY (student_id, course_id, semester)
);

-- -----------------------------------------------
-- 模块7：活动与参与
-- -----------------------------------------------
CREATE TABLE Event (
    event_id      SERIAL        PRIMARY KEY,
    event_name    VARCHAR(200)  NOT NULL,
    event_type    VARCHAR(20)   NOT NULL
        CHECK (event_type IN (
            '讲座','论坛','文艺演出','体育赛事',
            '学术交流','招聘宣讲','志愿服务','其他'
        )),
    start_time    TIMESTAMP     NOT NULL,
    end_time      TIMESTAMP
        CHECK (end_time IS NULL OR end_time > start_time),
    location_id   INT
        REFERENCES Location(location_id) ON DELETE SET NULL ON UPDATE CASCADE,
    host_dep_id   INT
        REFERENCES Department(dep_id) ON DELETE SET NULL ON UPDATE CASCADE,
    description   TEXT
);

CREATE TABLE EventParticipation (
    participant_id  INT         NOT NULL
        REFERENCES People(people_id) ON DELETE CASCADE ON UPDATE CASCADE,
    event_id        INT         NOT NULL
        REFERENCES Event(event_id) ON DELETE CASCADE ON UPDATE CASCADE,
    register_time   TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (participant_id, event_id)
);

-- -----------------------------------------------
-- 模块8：问答记录
-- -----------------------------------------------
CREATE TABLE QueryRecord (
    record_id       SERIAL      PRIMARY KEY,
    user_id         INT         NOT NULL
        REFERENCES SysUser(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    raw_question    TEXT        NOT NULL,
    query_time      TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    query_result    TEXT
);

-- -----------------------------------------------
-- 业务约束：同一人不能同时是 Student 与 Teacher
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION check_person_role()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'student' THEN
        IF EXISTS (SELECT 1 FROM Teacher WHERE people_id = NEW.people_id) THEN
            RAISE EXCEPTION '该人员已是教师，不能再注册为学生（people_id=%）', NEW.people_id;
        END IF;
    ELSIF TG_TABLE_NAME = 'teacher' THEN
        IF EXISTS (SELECT 1 FROM Student WHERE people_id = NEW.people_id) THEN
            RAISE EXCEPTION '该人员已是学生，不能再注册为教师（people_id=%）', NEW.people_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_student_role_check
BEFORE INSERT ON Student
FOR EACH ROW EXECUTE FUNCTION check_person_role();

CREATE TRIGGER trg_teacher_role_check
BEFORE INSERT ON Teacher
FOR EACH ROW EXECUTE FUNCTION check_person_role();

-- -----------------------------------------------
-- 索引设计（在主键/唯一索引之外补充二级索引）
-- -----------------------------------------------
CREATE INDEX idx_building_campus         ON Building(campus_id);
CREATE INDEX idx_location_building       ON Location(building_id);
CREATE INDEX idx_location_type           ON Location(facility_type);

CREATE INDEX idx_student_dep             ON Student(dep_id);
CREATE INDEX idx_teacher_dept            ON Teacher(dept_id);

CREATE INDEX idx_course_dep              ON Course(dep_id);
CREATE INDEX idx_teaching_semester       ON Teaching(semester);
CREATE INDEX idx_enrollment_semester     ON Enrollment(semester);
CREATE INDEX idx_enrollment_student      ON Enrollment(student_id);

CREATE INDEX idx_event_start_time        ON Event(start_time);
CREATE INDEX idx_event_type              ON Event(event_type);
CREATE INDEX idx_event_host_dep          ON Event(host_dep_id);

CREATE INDEX idx_queryrecord_user        ON QueryRecord(user_id);
CREATE INDEX idx_queryrecord_time        ON QueryRecord(query_time DESC);

COMMIT;

-- 提示：完整黑盒约束覆盖测试请执行 lab4/check.sql
