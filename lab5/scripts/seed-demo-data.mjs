import bcrypt from "bcryptjs";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME ?? "dbh_pj_lab5",
  user: process.env.DB_USER ?? "postgres",
  password: process.env.DB_PASSWORD ?? "postgres"
});

const DEMO_PASSWORD = "demo123456";

async function upsertOne(client, sql, params) {
  const result = await client.query(sql, params);
  return result.rows[0];
}

async function seed() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

    const campusHandan = await upsertOne(
      client,
      `
        INSERT INTO Campus (campus_name, address)
        VALUES ($1, $2)
        ON CONFLICT (campus_name)
        DO UPDATE SET address = EXCLUDED.address
        RETURNING campus_id
      `,
      ["邯郸校区", "上海市杨浦区邯郸路220号"]
    );

    const campusJiangwan = await upsertOne(
      client,
      `
        INSERT INTO Campus (campus_name, address)
        VALUES ($1, $2)
        ON CONFLICT (campus_name)
        DO UPDATE SET address = EXCLUDED.address
        RETURNING campus_id
      `,
      ["江湾校区", "上海市杨浦区淞沪路2005号"]
    );

    const guanghua = await upsertOne(
      client,
      `
        INSERT INTO Building (building_name, campus_id, building_type, description)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (building_name, campus_id)
        DO UPDATE SET building_type = EXCLUDED.building_type, description = EXCLUDED.description
        RETURNING building_id
      `,
      ["光华楼", campusHandan.campus_id, "教学楼", "综合教学与办公楼，适合展示课程和地点查询结果。"]
    );

    const library = await upsertOne(
      client,
      `
        INSERT INTO Building (building_name, campus_id, building_type, description)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (building_name, campus_id)
        DO UPDATE SET building_type = EXCLUDED.building_type, description = EXCLUDED.description
        RETURNING building_id
      `,
      ["文科图书馆", campusHandan.campus_id, "图书馆", "包含阅览区、自习室和公共查询空间。"]
    );

    const sportsCenter = await upsertOne(
      client,
      `
        INSERT INTO Building (building_name, campus_id, building_type, description)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (building_name, campus_id)
        DO UPDATE SET building_type = EXCLUDED.building_type, description = EXCLUDED.description
        RETURNING building_id
      `,
      ["江湾体育馆", campusJiangwan.campus_id, "体育设施", "校园活动和体育赛事的主要场馆。"]
    );

    const classroom = await upsertOne(
      client,
      `
        INSERT INTO Location (location_name, building_id, facility_type, description, open_time)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (location_name, building_id)
        DO UPDATE SET facility_type = EXCLUDED.facility_type, description = EXCLUDED.description, open_time = EXCLUDED.open_time
        RETURNING location_id
      `,
      ["光华楼西辅楼 101", guanghua.building_id, "教室", "可容纳120人的多媒体教室。", "周一至周五 08:00-21:30"]
    );

    const readingRoom = await upsertOne(
      client,
      `
        INSERT INTO Location (location_name, building_id, facility_type, description, open_time)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (location_name, building_id)
        DO UPDATE SET facility_type = EXCLUDED.facility_type, description = EXCLUDED.description, open_time = EXCLUDED.open_time
        RETURNING location_id
      `,
      ["三楼静音自习区", library.building_id, "自习室", "适合个人学习和安静阅读。", "每日 07:30-22:30"]
    );

    const arena = await upsertOne(
      client,
      `
        INSERT INTO Location (location_name, building_id, facility_type, description, open_time)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (location_name, building_id)
        DO UPDATE SET facility_type = EXCLUDED.facility_type, description = EXCLUDED.description, open_time = EXCLUDED.open_time
        RETURNING location_id
      `,
      ["主馆篮球场", sportsCenter.building_id, "运动场地", "校级篮球赛和社团训练场地。", "每日 09:00-21:00"]
    );

    const people = {};
    const peopleRows = [
      ["demo_student_01", "演示学生甲", "F", "13990000001", "demo_student_01@fudan.edu.cn"],
      ["demo_student_02", "演示学生乙", "M", "13990000002", "demo_student_02@fudan.edu.cn"],
      ["demo_teacher_01", "演示教师甲", "M", "13990000003", "demo_teacher_01@fudan.edu.cn"],
      ["demo_teacher_02", "演示教师乙", "F", "13990000004", "demo_teacher_02@fudan.edu.cn"],
      ["demo_admin_01", "演示管理员", "O", "13990000005", "demo_admin_01@fudan.edu.cn"],
      ["demo_manager_01", "演示院系负责人", "M", "13990000006", "demo_manager_01@fudan.edu.cn"]
    ];

    for (const [key, name, gender, phone, email] of peopleRows) {
      people[key] = await upsertOne(
        client,
        `
          INSERT INTO People (name, gender, phone, email)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (email)
          DO UPDATE SET name = EXCLUDED.name, gender = EXCLUDED.gender, phone = EXCLUDED.phone
          RETURNING people_id
        `,
        [name, gender, phone, email]
      );
    }

    const computerDept = await upsertOne(
      client,
      `
        INSERT INTO Department (dep_name, contact_info, office_location_id, manager_id, description)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (dep_name)
        DO UPDATE SET
          contact_info = EXCLUDED.contact_info,
          office_location_id = EXCLUDED.office_location_id,
          manager_id = EXCLUDED.manager_id,
          description = EXCLUDED.description
        RETURNING dep_id
      `,
      [
        "计算机科学技术学院",
        "cs-office@fudan.edu.cn / 021-65640001",
        classroom.location_id,
        people.demo_manager_01.people_id,
        "负责计算机类课程、教师与学生培养信息。"
      ]
    );

    const studentAffairsDept = await upsertOne(
      client,
      `
        INSERT INTO Department (dep_name, contact_info, office_location_id, manager_id, description)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (dep_name)
        DO UPDATE SET
          contact_info = EXCLUDED.contact_info,
          office_location_id = EXCLUDED.office_location_id,
          manager_id = EXCLUDED.manager_id,
          description = EXCLUDED.description
        RETURNING dep_id
      `,
      [
        "学生事务中心",
        "student-service@fudan.edu.cn / 021-65640002",
        readingRoom.location_id,
        people.demo_admin_01.people_id,
        "处理学生事务、活动报名与校园服务咨询。"
      ]
    );

    const studentRows = [
      [people.demo_student_01.people_id, "D20260001", "大二", "计算机科学与技术", computerDept.dep_id],
      [people.demo_student_02.people_id, "D20260002", "研一", "软件工程", computerDept.dep_id]
    ];

    for (const row of studentRows) {
      await client.query(
        `
          INSERT INTO Student (people_id, student_no, grade, major, dep_id)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (people_id)
          DO UPDATE SET student_no = EXCLUDED.student_no, grade = EXCLUDED.grade, major = EXCLUDED.major, dep_id = EXCLUDED.dep_id
        `,
        row
      );
    }

    const teacherRows = [
      [people.demo_teacher_01.people_id, "T20260001", "教授", computerDept.dep_id],
      [people.demo_teacher_02.people_id, "T20260002", "副教授", computerDept.dep_id]
    ];

    for (const row of teacherRows) {
      await client.query(
        `
          INSERT INTO Teacher (people_id, staff_no, title, dept_id)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (people_id)
          DO UPDATE SET staff_no = EXCLUDED.staff_no, title = EXCLUDED.title, dept_id = EXCLUDED.dept_id
        `,
        row
      );
    }

    const users = {};
    const userRows = [
      ["demo_student_01", people.demo_student_01.people_id, "student", computerDept.dep_id],
      ["demo_teacher_01", people.demo_teacher_01.people_id, "teacher", computerDept.dep_id],
      ["demo_admin_01", people.demo_admin_01.people_id, "admin", studentAffairsDept.dep_id]
    ];

    for (const [username, peopleId, roleType, depId] of userRows) {
      users[username] = await upsertOne(
        client,
        `
          INSERT INTO SysUser (people_id, username, password_hash, role_type, verification_status, dep_id)
          VALUES ($1, $2, $3, $4, 'verified', $5)
          ON CONFLICT (username)
          DO UPDATE SET
            people_id = EXCLUDED.people_id,
            password_hash = EXCLUDED.password_hash,
            role_type = EXCLUDED.role_type,
            verification_status = EXCLUDED.verification_status,
            dep_id = EXCLUDED.dep_id
          RETURNING user_id
        `,
        [peopleId, username, passwordHash, roleType, depId]
      );
    }

    const databaseCourse = await upsertOne(
      client,
      `
        INSERT INTO Course (course_name, dep_id, description)
        VALUES ($1, $2, $3)
        ON CONFLICT (course_name, dep_id)
        DO UPDATE SET description = EXCLUDED.description
        RETURNING course_id
      `,
      ["数据库系统", computerDept.dep_id, "关系数据库、SQL、事务、索引和应用系统开发。"]
    );

    const aiCourse = await upsertOne(
      client,
      `
        INSERT INTO Course (course_name, dep_id, description)
        VALUES ($1, $2, $3)
        ON CONFLICT (course_name, dep_id)
        DO UPDATE SET description = EXCLUDED.description
        RETURNING course_id
      `,
      ["人工智能导论", computerDept.dep_id, "机器学习、搜索、知识表示与智能应用。"]
    );

    const teachingRows = [
      [people.demo_teacher_01.people_id, databaseCourse.course_id, "2025-2026-2"],
      [people.demo_teacher_02.people_id, aiCourse.course_id, "2025-2026-2"]
    ];

    for (const row of teachingRows) {
      await client.query(
        `
          INSERT INTO Teaching (teacher_id, course_id, semester)
          VALUES ($1, $2, $3)
          ON CONFLICT (teacher_id, course_id, semester) DO NOTHING
        `,
        row
      );
    }

    const enrollmentRows = [
      [people.demo_student_01.people_id, databaseCourse.course_id, "2025-2026-2", 92.5],
      [people.demo_student_01.people_id, aiCourse.course_id, "2025-2026-2", 88],
      [people.demo_student_02.people_id, databaseCourse.course_id, "2025-2026-2", null]
    ];

    for (const row of enrollmentRows) {
      await client.query(
        `
          INSERT INTO Enrollment (student_id, course_id, semester, grade)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (student_id, course_id, semester)
          DO UPDATE SET grade = EXCLUDED.grade
        `,
        row
      );
    }

    await client.query(
      "DELETE FROM Event WHERE event_name IN ($1, $2)",
      ["校园数据库应用论坛", "春季校园篮球赛"]
    );

    const forum = await upsertOne(
      client,
      `
        INSERT INTO Event (event_name, event_type, start_time, end_time, location_id, host_dep_id, description)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING event_id
      `,
      [
        "校园数据库应用论坛",
        "论坛",
        "2026-06-08 14:00:00",
        "2026-06-08 16:30:00",
        classroom.location_id,
        computerDept.dep_id,
        "面向数据库课程项目的展示与交流活动。"
      ]
    );

    const basketball = await upsertOne(
      client,
      `
        INSERT INTO Event (event_name, event_type, start_time, end_time, location_id, host_dep_id, description)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING event_id
      `,
      [
        "春季校园篮球赛",
        "体育赛事",
        "2026-06-12 18:00:00",
        "2026-06-12 20:00:00",
        arena.location_id,
        studentAffairsDept.dep_id,
        "学院联队公开赛，可用于活动查询展示。"
      ]
    );

    const participationRows = [
      [people.demo_student_01.people_id, forum.event_id],
      [people.demo_teacher_01.people_id, forum.event_id],
      [people.demo_student_02.people_id, basketball.event_id]
    ];

    for (const row of participationRows) {
      await client.query(
        `
          INSERT INTO EventParticipation (participant_id, event_id)
          VALUES ($1, $2)
          ON CONFLICT (participant_id, event_id) DO NOTHING
        `,
        row
      );
    }

    const queryRows = [
      [
        users.demo_student_01.user_id,
        "我这学期选了哪些课？",
        "已选课程：数据库系统、人工智能导论；其中数据库系统成绩为92.50。"
      ],
      [
        users.demo_student_01.user_id,
        "光华楼西辅楼101什么时候开放？",
        "开放时间：周一至周五 08:00-21:30；地点类型：教室。"
      ],
      [
        users.demo_teacher_01.user_id,
        "我负责教授哪些课程？",
        "当前学期教授课程：数据库系统（2025-2026-2）。"
      ],
      [
        users.demo_admin_01.user_id,
        "最近有哪些校园活动？",
        "校园数据库应用论坛、春季校园篮球赛。"
      ]
    ];

    await client.query(
      `
        DELETE FROM QueryRecord
        WHERE user_id IN ($1, $2, $3)
          AND raw_question IN ($4, $5, $6, $7)
      `,
      [
        users.demo_student_01.user_id,
        users.demo_teacher_01.user_id,
        users.demo_admin_01.user_id,
        ...queryRows.map((row) => row[1])
      ]
    );

    for (const row of queryRows) {
      await client.query(
        `
          INSERT INTO QueryRecord (user_id, raw_question, query_result)
          VALUES ($1, $2, $3)
        `,
        row
      );
    }

    await client.query("COMMIT");

    console.log("Demo data seeded successfully.");
    console.log(`Login accounts use password: ${DEMO_PASSWORD}`);
    console.log("Accounts: demo_student_01, demo_teacher_01, demo_admin_01");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((error) => {
  console.error("Failed to seed demo data.");
  console.error(error);
  process.exitCode = 1;
});
