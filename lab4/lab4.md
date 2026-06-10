# LAB4 数据库实现说明（基于 Lab1~Lab3）

**项目**：复旦校园百事通问答系统  
**目标数据库**：PostgreSQL 16  
**目的**：给出可直接执行的建表 SQL、主要约束实现方案、必要索引设计、初始测试数据，保证数据库可创建、可导入、可联调。

---

## 1. 已有方案总结（从前序 Lab 继承）

前序文档已基本确定以下逻辑结构，Lab4 直接落地实现：

- 采用 `People` + `Student/Teacher` 的类表继承（共享 `people_id`）。
- 课程教授关系已调整为 `Teaching`（教师-课程，`M:N`）。
- 增加 `Enrollment`（学生-课程，`M:N`）与 `EventParticipation`（人员-活动，`M:N`）。
- 保留 `SysUser`（避免 `User` 保留字冲突）。
- 外键级联策略：按业务语义区分 `CASCADE / RESTRICT / SET NULL`。

---

## 2. 建表 SQL（可直接执行）

> 说明：以下脚本按依赖顺序组织，可直接一次性执行。  
> 若需重建，请先执行 `DROP TABLE` 段。

```sql
-- =============================================
-- LAB4: Schema DDL (PostgreSQL 16)
-- =============================================

-- 可选：重建时执行
DROP TABLE IF EXISTS QueryRecord, EventParticipation, Enrollment, Teaching,
  Event, Course, SysUser, Teacher, Student, Department, Location, Building, Campus, People CASCADE;

-- 1) 空间地理
CREATE TABLE Campus (
    campus_id   SERIAL PRIMARY KEY,
    campus_name VARCHAR(50)  NOT NULL UNIQUE,
    address     VARCHAR(200) NOT NULL
);

CREATE TABLE Building (
    building_id     SERIAL PRIMARY KEY,
    building_name   VARCHAR(100) NOT NULL,
    campus_id       INT NOT NULL
        REFERENCES Campus(campus_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    building_type   VARCHAR(20) NOT NULL
        CHECK (building_type IN (
            '教学楼','宿舍楼','食堂楼','图书馆',
            '行政楼','实验楼','体育设施','医疗卫生','其他'
        )),
    description     TEXT,
    UNIQUE (building_name, campus_id)
);

CREATE TABLE Location (
    location_id     SERIAL PRIMARY KEY,
    location_name   VARCHAR(100) NOT NULL,
    building_id     INT NOT NULL
        REFERENCES Building(building_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    facility_type   VARCHAR(20) NOT NULL
        CHECK (facility_type IN (
            '教室','食堂','咖啡店','自习室','图书馆',
            '实验室','运动场地','办公室','医务室','其他'
        )),
    description     TEXT,
    open_time       VARCHAR(100),
    UNIQUE (location_name, building_id)
);

-- 2) 人员基表
CREATE TABLE People (
    people_id   SERIAL PRIMARY KEY,
    name        VARCHAR(50)  NOT NULL,
    gender      CHAR(1)      NOT NULL CHECK (gender IN ('M','F','O')),
    phone       VARCHAR(20)  UNIQUE,
    email       VARCHAR(100) UNIQUE
);

-- 3) 院系
CREATE TABLE Department (
    dep_id              SERIAL PRIMARY KEY,
    dep_name            VARCHAR(100) NOT NULL UNIQUE,
    contact_info        VARCHAR(200),
    office_location_id  INT
        REFERENCES Location(location_id) ON DELETE SET NULL ON UPDATE CASCADE,
    manager_id          INT
        REFERENCES People(people_id) ON DELETE SET NULL ON UPDATE CASCADE
        DEFERRABLE INITIALLY DEFERRED,
    description         TEXT
);

-- 4) 学生/教师扩展
CREATE TABLE Student (
    people_id   INT PRIMARY KEY
        REFERENCES People(people_id) ON DELETE CASCADE ON UPDATE CASCADE,
    student_no  VARCHAR(20)  NOT NULL UNIQUE,
    grade       VARCHAR(10)  NOT NULL
        CHECK (grade IN (
            '大一','大二','大三','大四',
            '研一','研二','研三',
            '博一','博二','博三','博四','其他'
        )),
    major       VARCHAR(100) NOT NULL,
    dep_id      INT NOT NULL
        REFERENCES Department(dep_id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE Teacher (
    people_id   INT PRIMARY KEY
        REFERENCES People(people_id) ON DELETE CASCADE ON UPDATE CASCADE,
    staff_no    VARCHAR(20) NOT NULL UNIQUE,
    title       VARCHAR(20) NOT NULL
        CHECK (title IN ('助教','讲师','副教授','教授','研究员','特聘教授','其他')),
    dept_id     INT NOT NULL
        REFERENCES Department(dep_id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- 5) 用户
CREATE TABLE SysUser (
    user_id              SERIAL PRIMARY KEY,
    people_id            INT NOT NULL UNIQUE
        REFERENCES People(people_id) ON DELETE CASCADE ON UPDATE CASCADE,
    username             VARCHAR(50)  NOT NULL UNIQUE,
    password_hash        VARCHAR(255) NOT NULL,
    role_type            VARCHAR(10)  NOT NULL CHECK (role_type IN ('student','teacher','admin')),
    verification_status  VARCHAR(10)  NOT NULL DEFAULT 'pending'
        CHECK (verification_status IN ('pending','verified','rejected')),
    dep_id               INT
        REFERENCES Department(dep_id) ON DELETE SET NULL ON UPDATE CASCADE,
    created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6) 课程与 M:N 关系
CREATE TABLE Course (
    course_id    SERIAL PRIMARY KEY,
    course_name  VARCHAR(200) NOT NULL,
    dep_id       INT NOT NULL
        REFERENCES Department(dep_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    description  TEXT,
    UNIQUE (course_name, dep_id)
);

CREATE TABLE Teaching (
    teacher_id  INT NOT NULL
        REFERENCES Teacher(people_id) ON DELETE CASCADE ON UPDATE CASCADE,
    course_id   INT NOT NULL
        REFERENCES Course(course_id) ON DELETE CASCADE ON UPDATE CASCADE,
    semester    CHAR(11) NOT NULL CHECK (semester ~ '^\d{4}-\d{4}-[12]$'),
    PRIMARY KEY (teacher_id, course_id, semester)
);

CREATE TABLE Enrollment (
    student_id  INT NOT NULL
        REFERENCES Student(people_id) ON DELETE CASCADE ON UPDATE CASCADE,
    course_id   INT NOT NULL
        REFERENCES Course(course_id) ON DELETE CASCADE ON UPDATE CASCADE,
    semester    CHAR(11) NOT NULL CHECK (semester ~ '^\d{4}-\d{4}-[12]$'),
    grade       NUMERIC(5,2) CHECK (grade IS NULL OR (grade >= 0 AND grade <= 100)),
    PRIMARY KEY (student_id, course_id, semester)
);

-- 7) 活动与 M:N 关系
CREATE TABLE Event (
    event_id     SERIAL PRIMARY KEY,
    event_name   VARCHAR(200) NOT NULL,
    event_type   VARCHAR(20) NOT NULL
        CHECK (event_type IN ('讲座','论坛','文艺演出','体育赛事','学术交流','招聘宣讲','志愿服务','其他')),
    start_time   TIMESTAMP NOT NULL,
    end_time     TIMESTAMP CHECK (end_time IS NULL OR end_time > start_time),
    location_id  INT REFERENCES Location(location_id) ON DELETE SET NULL ON UPDATE CASCADE,
    host_dep_id  INT REFERENCES Department(dep_id) ON DELETE SET NULL ON UPDATE CASCADE,
    description  TEXT
);

CREATE TABLE EventParticipation (
    participant_id  INT NOT NULL
        REFERENCES People(people_id) ON DELETE CASCADE ON UPDATE CASCADE,
    event_id        INT NOT NULL
        REFERENCES Event(event_id) ON DELETE CASCADE ON UPDATE CASCADE,
    register_time   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (participant_id, event_id)
);

-- 8) 查询日志
CREATE TABLE QueryRecord (
    record_id      SERIAL PRIMARY KEY,
    user_id        INT NOT NULL
        REFERENCES SysUser(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    raw_question   TEXT NOT NULL,
    query_time     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    query_result   TEXT
);

-- 可选：防止同一 people_id 同时是学生和教师
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
```

---

## 3. 主要约束实现方案（汇总）

- **主键策略**
  - 主实体使用 `SERIAL` 单列主键（如 `People/Course/Event`）。
  - 继承子表 `Student/Teacher` 复用 `people_id` 作为共享主键。
  - 中间关系表使用联合主键（`Teaching`、`Enrollment`、`EventParticipation`）。

- **引用完整性策略**
  - 强从属关系用 `ON DELETE CASCADE`（如 `People -> Student/Teacher/SysUser`，`Course -> Enrollment/Teaching`）。
  - 主数据被依赖时用 `ON DELETE RESTRICT`（如 `Campus -> Building`，`Department -> Course/Student/Teacher`）。
  - 历史记录保留场景用 `ON DELETE SET NULL`（如 `Event.location_id`、`Department.manager_id`）。

- **业务合法性策略**
  - 枚举类字段统一 `CHECK IN (...)`（性别、职称、角色、活动类型等）。
  - 时间与范围校验：`end_time > start_time`、`grade in [0,100]`。
  - 学期格式校验：`semester ~ '^\d{4}-\d{4}-[12]$'`。

- **唯一性策略**
  - 人员标识：`student_no`、`staff_no`、`username` 全局唯一。
  - 地理/课程名称使用组合唯一：`(building_name, campus_id)`、`(location_name, building_id)`、`(course_name, dep_id)`。

- **角色互斥策略**
  - “同一人不可同时是学生和教师”采用触发器（`trg_student_role_check` + `trg_teacher_role_check`）实现。

---

## 4. 必要索引设计（避免冗余）

> 说明：主键与唯一约束已隐式建索引；以下只补充“外键连接 + 高频过滤排序”索引。

```sql
-- 外键连接索引（PostgreSQL 不会自动为 FK 建索引）
CREATE INDEX idx_building_campus_id      ON Building(campus_id);
CREATE INDEX idx_location_building_id    ON Location(building_id);
CREATE INDEX idx_student_dep_id          ON Student(dep_id);
CREATE INDEX idx_teacher_dept_id         ON Teacher(dept_id);
CREATE INDEX idx_course_dep_id           ON Course(dep_id);
CREATE INDEX idx_department_office_loc   ON Department(office_location_id);
CREATE INDEX idx_department_manager_id   ON Department(manager_id);
CREATE INDEX idx_sysuser_dep_id          ON SysUser(dep_id);
CREATE INDEX idx_event_location_id       ON Event(location_id);
CREATE INDEX idx_event_host_dep_id       ON Event(host_dep_id);
CREATE INDEX idx_queryrecord_user_id     ON QueryRecord(user_id);

-- 高频检索索引
CREATE INDEX idx_location_facility_type  ON Location(facility_type);
CREATE INDEX idx_event_start_time        ON Event(start_time);
CREATE INDEX idx_event_type              ON Event(event_type);
CREATE INDEX idx_queryrecord_time_desc   ON QueryRecord(query_time DESC);

-- M:N 表辅助检索（联合主键已覆盖其最左前缀，再补反向查询列）
CREATE INDEX idx_teaching_course_sem     ON Teaching(course_id, semester);
CREATE INDEX idx_enrollment_course_sem   ON Enrollment(course_id, semester);
CREATE INDEX idx_event_participation_evt ON EventParticipation(event_id);
```

---

## 5. 初始测试数据（可直接导入）

```sql
BEGIN;

-- 1) Campus
INSERT INTO Campus (campus_id, campus_name, address) VALUES
(1, '邯郸校区', '上海市杨浦区邯郸路220号'),
(2, '江湾校区', '上海市杨浦区淞沪路2005号');

-- 2) Building
INSERT INTO Building (building_id, building_name, campus_id, building_type, description) VALUES
(1, '光华楼', 1, '教学楼', '主教学楼'),
(2, '李兆基图书馆', 1, '图书馆', '校区图书馆'),
(3, '第一教学楼', 2, '教学楼', '江湾教学楼');

-- 3) Location
INSERT INTO Location (location_id, location_name, building_id, facility_type, description, open_time) VALUES
(1, 'H3101', 1, '教室', '三楼大教室', '08:00-21:00'),
(2, '北区食堂', 1, '食堂', '一楼食堂', '06:30-20:30'),
(3, '总馆阅览区', 2, '图书馆', '安静自习', '07:30-22:00');

-- 4) People
INSERT INTO People (people_id, name, gender, phone, email) VALUES
(1, '张三', 'M', '13800000001', 'zhangsan@fudan.edu.cn'),
(2, '李四', 'F', '13800000002', 'lisi@fudan.edu.cn'),
(3, '王老师', 'M', '13800000003', 'wang@fudan.edu.cn'),
(4, '赵老师', 'F', '13800000004', 'zhao@fudan.edu.cn'),
(5, '管理员', 'O', '13800000005', 'admin@fudan.edu.cn');

-- 5) Department（先不填 manager_id，避免初始化时引用顺序问题）
INSERT INTO Department (dep_id, dep_name, contact_info, office_location_id, manager_id, description) VALUES
(1, '计算机科学技术学院', '021-00000001', 1, NULL, '计算机相关学科'),
(2, '数学科学学院', '021-00000002', 3, NULL, '数学相关学科');

-- 回填负责人
UPDATE Department SET manager_id = 3 WHERE dep_id = 1;
UPDATE Department SET manager_id = 4 WHERE dep_id = 2;

-- 6) Student / Teacher
INSERT INTO Student (people_id, student_no, grade, major, dep_id) VALUES
(1, '22300001', '大三', '计算机科学与技术', 1),
(2, '22300002', '大二', '数学与应用数学', 2);

INSERT INTO Teacher (people_id, staff_no, title, dept_id) VALUES
(3, 'T1001', '教授', 1),
(4, 'T1002', '副教授', 2);

-- 7) SysUser
INSERT INTO SysUser (user_id, people_id, username, password_hash, role_type, verification_status, dep_id, created_at) VALUES
(1, 1, 'zhangsan', '$2b$12$studentHash', 'student', 'verified', 1, CURRENT_TIMESTAMP),
(2, 3, 'wanglaoshi', '$2b$12$teacherHash', 'teacher', 'verified', 1, CURRENT_TIMESTAMP),
(3, 5, 'admin', '$2b$12$adminHash', 'admin', 'verified', NULL, CURRENT_TIMESTAMP);

-- 8) Course
INSERT INTO Course (course_id, course_name, dep_id, description) VALUES
(1, '数据库设计', 1, '关系数据库系统设计'),
(2, '离散数学', 2, '数学基础课程');

-- 9) Teaching（M:N）
INSERT INTO Teaching (teacher_id, course_id, semester) VALUES
(3, 1, '2025-2026-1'),
(4, 2, '2025-2026-1'),
(3, 2, '2025-2026-1');

-- 10) Enrollment（M:N）
INSERT INTO Enrollment (student_id, course_id, semester, grade) VALUES
(1, 1, '2025-2026-1', 92.5),
(1, 2, '2025-2026-1', 88.0),
(2, 2, '2025-2026-1', NULL);

-- 11) Event
INSERT INTO Event (event_id, event_name, event_type, start_time, end_time, location_id, host_dep_id, description) VALUES
(1, '数据库前沿讲座', '讲座', '2026-06-10 14:00:00', '2026-06-10 16:00:00', 1, 1, '邀请校外专家'),
(2, '数学建模分享会', '论坛', '2026-06-18 18:30:00', '2026-06-18 20:00:00', 3, 2, '竞赛经验交流');

-- 12) EventParticipation（M:N）
INSERT INTO EventParticipation (participant_id, event_id, register_time) VALUES
(1, 1, CURRENT_TIMESTAMP),
(2, 2, CURRENT_TIMESTAMP),
(3, 1, CURRENT_TIMESTAMP);

-- 13) QueryRecord
INSERT INTO QueryRecord (record_id, user_id, raw_question, query_time, query_result) VALUES
(1, 1, '邯郸校区有哪些食堂？', CURRENT_TIMESTAMP, '北区食堂等'),
(2, 2, '数据库设计课程在哪上？', CURRENT_TIMESTAMP, '光华楼 H3101');

COMMIT;

-- 可选：修正 SERIAL 序列到当前最大ID（若显式插入了 ID）
SELECT setval(pg_get_serial_sequence('Campus', 'campus_id'), (SELECT MAX(campus_id) FROM Campus));
SELECT setval(pg_get_serial_sequence('Building', 'building_id'), (SELECT MAX(building_id) FROM Building));
SELECT setval(pg_get_serial_sequence('Location', 'location_id'), (SELECT MAX(location_id) FROM Location));
SELECT setval(pg_get_serial_sequence('People', 'people_id'), (SELECT MAX(people_id) FROM People));
SELECT setval(pg_get_serial_sequence('Department', 'dep_id'), (SELECT MAX(dep_id) FROM Department));
SELECT setval(pg_get_serial_sequence('SysUser', 'user_id'), (SELECT MAX(user_id) FROM SysUser));
SELECT setval(pg_get_serial_sequence('Course', 'course_id'), (SELECT MAX(course_id) FROM Course));
SELECT setval(pg_get_serial_sequence('Event', 'event_id'), (SELECT MAX(event_id) FROM Event));
SELECT setval(pg_get_serial_sequence('QueryRecord', 'record_id'), (SELECT MAX(record_id) FROM QueryRecord));
```

---

## 6. 导入后最小验证 SQL

```sql
-- 1) 基础数量检查
SELECT
  (SELECT COUNT(*) FROM People) AS people_cnt,
  (SELECT COUNT(*) FROM Student) AS student_cnt,
  (SELECT COUNT(*) FROM Teacher) AS teacher_cnt,
  (SELECT COUNT(*) FROM Course) AS course_cnt,
  (SELECT COUNT(*) FROM Enrollment) AS enrollment_cnt;

-- 2) M:N 教授关系验证
SELECT c.course_name, p.name AS teacher_name, t.semester
FROM Teaching t
JOIN Course c ON c.course_id = t.course_id
JOIN Teacher te ON te.people_id = t.teacher_id
JOIN People p ON p.people_id = te.people_id
ORDER BY c.course_name, teacher_name;

-- 3) M:N 选课关系验证
SELECT s.student_no, c.course_name, e.semester, e.grade
FROM Enrollment e
JOIN Student s ON s.people_id = e.student_id
JOIN Course c ON c.course_id = e.course_id
ORDER BY s.student_no, c.course_name;

-- 4) 活动参与验证
SELECT ev.event_name, COUNT(*) AS participant_count
FROM EventParticipation ep
JOIN Event ev ON ev.event_id = ep.event_id
GROUP BY ev.event_id, ev.event_name
ORDER BY ev.event_id;
```

---

## 7. 交付建议

实验提交时可直接包含：

- `lab4/lab4.md`（本说明文档）
- （可选）将文档中的 SQL 分拆为：
  - `lab4/schema.sql`
  - `lab4/indexes.sql`
  - `lab4/seed.sql`

当前版本已覆盖题目要求的四项核心内容，并可支持后续接口开发联调。
