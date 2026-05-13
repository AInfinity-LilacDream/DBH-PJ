-- ============================================================
-- LAB4: 完整性约束黑盒检查脚本（PostgreSQL 16）
-- 用法：
--   1) 先执行: psql -d <db> -f lab4/lab4_schema_seed.sql
--   2) 再执行: psql -v ON_ERROR_STOP=1 -d <db> -f lab4/check.sql
--
-- 说明：
-- - 本脚本通过“正例 + 负例”覆盖 schema 中完整性约束
-- - 负例使用 EXCEPTION 子事务回滚，不污染后续测试
-- - 每个测试块会输出 NOTICE，方便观察通过进度
-- ============================================================

BEGIN;

-- 让脚本可重复执行：先清空业务数据并重置自增序列
TRUNCATE TABLE QueryRecord, EventParticipation, Enrollment, Teaching, Event, Course,
               SysUser, Teacher, Student, Department, Location, Building, Campus, People
RESTART IDENTITY CASCADE;

DO $$
DECLARE
    v_cnt INT;
BEGIN
    RAISE NOTICE '=== Step 0: 准备基础正例数据 ===';

    INSERT INTO Campus (campus_name, address) VALUES
      ('测试校区A', '地址A'),
      ('测试校区B', '地址B');

    INSERT INTO Building (building_name, campus_id, building_type, description) VALUES
      ('测试教学楼A', 1, '教学楼', '用于约束测试'),
      ('测试图书馆B', 2, '图书馆', '用于约束测试');

    INSERT INTO Location (location_name, building_id, facility_type, description, open_time) VALUES
      ('A-101', 1, '教室', '教室', '08:00-21:00'),
      ('B-阅览室', 2, '图书馆', '阅览区', '08:00-22:00'),
      ('A-院办', 1, '办公室', '院系办公室', '工作日');

    INSERT INTO People (name, gender, phone, email) VALUES
      ('学生甲', 'M', '13000000001', 'stu_a@test.edu'),
      ('学生乙', 'F', '13000000002', 'stu_b@test.edu'),
      ('教师甲', 'M', '13000000003', 'tea_a@test.edu'),
      ('教师乙', 'F', '13000000004', 'tea_b@test.edu'),
      ('管理员甲', 'O', '13000000005', 'admin_a@test.edu'),
      ('负责人甲', 'M', '13000000006', 'mgr_a@test.edu');

    INSERT INTO Department (dep_name, contact_info, office_location_id, manager_id, description) VALUES
      ('测试计科院', '000-111', 3, 6, '测试院系1'),
      ('测试数院', '000-222', 3, NULL, '测试院系2');

    INSERT INTO Student (people_id, student_no, grade, major, dep_id) VALUES
      (1, 'S0001', '大一', '计算机科学', 1),
      (2, 'S0002', '大二', '数学', 2);

    INSERT INTO Teacher (people_id, staff_no, title, dept_id) VALUES
      (3, 'T0001', '教授', 1),
      (4, 'T0002', '副教授', 2);

    -- SysUser 默认值覆盖（verification_status / created_at）
    INSERT INTO SysUser (people_id, username, password_hash, role_type, dep_id)
    VALUES (1, 'user_stu_a', 'hash_stu', 'student', 1);

    INSERT INTO SysUser (people_id, username, password_hash, role_type, verification_status, dep_id)
    VALUES
      (3, 'user_tea_a', 'hash_tea', 'teacher', 'verified', 1),
      (5, 'user_admin', 'hash_admin', 'admin', 'rejected', NULL);

    INSERT INTO Course (course_name, dep_id, description) VALUES
      ('数据库系统', 1, '测试课程'),
      ('高等代数', 2, '测试课程');

    INSERT INTO Teaching (teacher_id, course_id, semester) VALUES
      (3, 1, '2025-2026-1'),
      (4, 2, '2025-2026-2');

    INSERT INTO Enrollment (student_id, course_id, semester, grade) VALUES
      (1, 1, '2025-2026-1', 95.00),
      (2, 2, '2025-2026-2', NULL);

    INSERT INTO Event (event_name, event_type, start_time, end_time, location_id, host_dep_id, description) VALUES
      ('测试讲座A', '讲座', '2026-06-01 10:00:00', '2026-06-01 12:00:00', 1, 1, '正例活动'),
      ('测试论坛B', '论坛', '2026-06-02 15:00:00', '2026-06-02 17:00:00', 2, 2, '正例活动');

    INSERT INTO EventParticipation (participant_id, event_id) VALUES
      (1, 1),
      (2, 2),
      (3, 1);

    INSERT INTO QueryRecord (user_id, raw_question, query_result)
    VALUES
      (1, '测试问题1', '测试回答1'),
      (2, '测试问题2', NULL);

    SELECT COUNT(*) INTO v_cnt
    FROM SysUser
    WHERE username = 'user_stu_a'
      AND verification_status = 'pending'
      AND created_at IS NOT NULL;
    IF v_cnt <> 1 THEN
      RAISE EXCEPTION 'DEFAULT 约束未生效：SysUser.verification_status/created_at';
    END IF;

    SELECT COUNT(*) INTO v_cnt
    FROM EventParticipation
    WHERE participant_id = 1 AND event_id = 1 AND register_time IS NOT NULL;
    IF v_cnt <> 1 THEN
      RAISE EXCEPTION 'DEFAULT 约束未生效：EventParticipation.register_time';
    END IF;

    SELECT COUNT(*) INTO v_cnt
    FROM QueryRecord
    WHERE user_id = 1 AND query_time IS NOT NULL;
    IF v_cnt <> 1 THEN
      RAISE EXCEPTION 'DEFAULT 约束未生效：QueryRecord.query_time';
    END IF;
END $$;

DO $$
BEGIN
    RAISE NOTICE '=== Step 1: NOT NULL 约束负例 ===';
    BEGIN
        INSERT INTO Course (course_name, dep_id) VALUES (NULL, 1);
        RAISE EXCEPTION 'NOT NULL 未触发（Course.course_name）';
    EXCEPTION WHEN not_null_violation THEN
        RAISE NOTICE 'PASS: NOT NULL -> Course.course_name';
    END;
END $$;

DO $$
BEGIN
    RAISE NOTICE '=== Step 2: UNIQUE 约束负例 ===';
    BEGIN
        INSERT INTO People (name, gender, phone, email)
        VALUES ('重复手机号', 'M', '13000000001', 'dup_phone@test.edu');
        RAISE EXCEPTION 'UNIQUE 未触发（People.phone）';
    EXCEPTION WHEN unique_violation THEN
        RAISE NOTICE 'PASS: UNIQUE -> People.phone';
    END;

    BEGIN
        INSERT INTO SysUser (people_id, username, password_hash, role_type, dep_id)
        VALUES (2, 'user_stu_a', 'hash_dup', 'student', 2);
        RAISE EXCEPTION 'UNIQUE 未触发（SysUser.username）';
    EXCEPTION WHEN unique_violation THEN
        RAISE NOTICE 'PASS: UNIQUE -> SysUser.username';
    END;

    BEGIN
        INSERT INTO Building (building_name, campus_id, building_type)
        VALUES ('测试教学楼A', 1, '教学楼');
        RAISE EXCEPTION 'UNIQUE 未触发（Building(building_name,campus_id)）';
    EXCEPTION WHEN unique_violation THEN
        RAISE NOTICE 'PASS: UNIQUE -> Building(building_name,campus_id)';
    END;
END $$;

DO $$
BEGIN
    RAISE NOTICE '=== Step 3: CHECK 约束负例 ===';
    BEGIN
        INSERT INTO People (name, gender, phone, email)
        VALUES ('非法性别', 'X', '13000000111', 'bad_gender@test.edu');
        RAISE EXCEPTION 'CHECK 未触发（People.gender）';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE 'PASS: CHECK -> People.gender';
    END;

    BEGIN
        INSERT INTO Event (event_name, event_type, start_time, end_time, location_id, host_dep_id)
        VALUES ('非法活动类型', '比赛', '2026-06-03 10:00:00', '2026-06-03 11:00:00', 1, 1);
        RAISE EXCEPTION 'CHECK 未触发（Event.event_type）';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE 'PASS: CHECK -> Event.event_type';
    END;

    BEGIN
        INSERT INTO Event (event_name, event_type, start_time, end_time, location_id, host_dep_id)
        VALUES ('结束时间非法', '讲座', '2026-06-03 12:00:00', '2026-06-03 11:00:00', 1, 1);
        RAISE EXCEPTION 'CHECK 未触发（Event.end_time > start_time）';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE 'PASS: CHECK -> Event.end_time > start_time';
    END;

    BEGIN
        INSERT INTO Teaching (teacher_id, course_id, semester)
        VALUES (3, 1, '2025秋');
        RAISE EXCEPTION 'CHECK 未触发（Teaching.semester）';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE 'PASS: CHECK -> Teaching.semester format';
    END;

    BEGIN
        INSERT INTO Enrollment (student_id, course_id, semester, grade)
        VALUES (1, 2, '2025-2026-1', 120);
        RAISE EXCEPTION 'CHECK 未触发（Enrollment.grade）';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE 'PASS: CHECK -> Enrollment.grade range';
    END;
END $$;

DO $$
BEGIN
    RAISE NOTICE '=== Step 4: FK 存在性负例 ===';
    BEGIN
        INSERT INTO Student (people_id, student_no, grade, major, dep_id)
        VALUES (9999, 'S9999', '大一', '不存在人员', 1);
        RAISE EXCEPTION 'FK 未触发（Student.people_id -> People）';
    EXCEPTION WHEN foreign_key_violation THEN
        RAISE NOTICE 'PASS: FK exists -> Student.people_id';
    END;

    BEGIN
        INSERT INTO Course (course_name, dep_id)
        VALUES ('不存在院系课程', 9999);
        RAISE EXCEPTION 'FK 未触发（Course.dep_id -> Department）';
    EXCEPTION WHEN foreign_key_violation THEN
        RAISE NOTICE 'PASS: FK exists -> Course.dep_id';
    END;
END $$;

DO $$
DECLARE
    v_cnt INT;
BEGIN
    RAISE NOTICE '=== Step 5: ON DELETE RESTRICT / SET NULL / CASCADE 行为 ===';

    -- RESTRICT: 有 Building 依赖时删除 Campus 应失败
    BEGIN
        DELETE FROM Campus WHERE campus_id = 1;
        RAISE EXCEPTION 'RESTRICT 未触发（Campus 被 Building 引用）';
    EXCEPTION WHEN foreign_key_violation THEN
        RAISE NOTICE 'PASS: ON DELETE RESTRICT -> Campus/Building';
    END;

    -- SET NULL: 删除 Department 后，Event.host_dep_id 应置空
    -- 先插入专用院系与事件
    INSERT INTO Department (dep_name, contact_info, office_location_id, manager_id, description)
    VALUES ('测试院系_SETNULL', '000-333', 3, NULL, 'set null test');

    INSERT INTO Event (event_name, event_type, start_time, end_time, location_id, host_dep_id, description)
    VALUES ('SETNULL测试活动', '讲座', '2026-06-05 10:00:00', '2026-06-05 11:00:00', 1,
            (SELECT dep_id FROM Department WHERE dep_name = '测试院系_SETNULL'),
            'set null test');

    DELETE FROM Department WHERE dep_name = '测试院系_SETNULL';
    SELECT COUNT(*) INTO v_cnt FROM Event WHERE event_name = 'SETNULL测试活动' AND host_dep_id IS NULL;
    IF v_cnt <> 1 THEN
        RAISE EXCEPTION 'ON DELETE SET NULL 失败（Event.host_dep_id）';
    END IF;
    RAISE NOTICE 'PASS: ON DELETE SET NULL -> Event.host_dep_id';

    -- SET NULL: 删除 Location 后，Event.location_id 应置空
    INSERT INTO Building (building_name, campus_id, building_type, description)
    VALUES ('SETNULL专用楼', 2, '教学楼', 'set null loc test');
    INSERT INTO Location (location_name, building_id, facility_type, description)
    VALUES ('SETNULL专用地点', (SELECT building_id FROM Building WHERE building_name = 'SETNULL专用楼' AND campus_id = 2), '教室', 'set null loc');
    INSERT INTO Event (event_name, event_type, start_time, end_time, location_id, host_dep_id, description)
    VALUES ('SETNULL地点活动', '论坛', '2026-06-06 10:00:00', '2026-06-06 11:00:00',
            (SELECT location_id FROM Location WHERE location_name = 'SETNULL专用地点'),
            1, 'set null loc test');
    DELETE FROM Location WHERE location_name = 'SETNULL专用地点';
    SELECT COUNT(*) INTO v_cnt FROM Event WHERE event_name = 'SETNULL地点活动' AND location_id IS NULL;
    IF v_cnt <> 1 THEN
        RAISE EXCEPTION 'ON DELETE SET NULL 失败（Event.location_id）';
    END IF;
    RAISE NOTICE 'PASS: ON DELETE SET NULL -> Event.location_id';

    -- CASCADE: 删除 SysUser 后，QueryRecord 应级联删除
    INSERT INTO QueryRecord (user_id, raw_question, query_result)
    VALUES (3, '级联删除测试问题', '级联删除测试答案');
    DELETE FROM SysUser WHERE user_id = 3;
    SELECT COUNT(*) INTO v_cnt FROM QueryRecord WHERE raw_question = '级联删除测试问题';
    IF v_cnt <> 0 THEN
        RAISE EXCEPTION 'ON DELETE CASCADE 失败（QueryRecord.user_id）';
    END IF;
    RAISE NOTICE 'PASS: ON DELETE CASCADE -> QueryRecord.user_id';
END $$;

DO $$
BEGIN
    RAISE NOTICE '=== Step 6: 联合主键（防重复）负例 ===';
    BEGIN
        INSERT INTO Teaching (teacher_id, course_id, semester) VALUES (3, 1, '2025-2026-1');
        RAISE EXCEPTION '联合主键未触发（Teaching）';
    EXCEPTION WHEN unique_violation THEN
        RAISE NOTICE 'PASS: PK composite -> Teaching';
    END;

    BEGIN
        INSERT INTO Enrollment (student_id, course_id, semester, grade)
        VALUES (1, 1, '2025-2026-1', 99);
        RAISE EXCEPTION '联合主键未触发（Enrollment）';
    EXCEPTION WHEN unique_violation THEN
        RAISE NOTICE 'PASS: PK composite -> Enrollment';
    END;

    BEGIN
        INSERT INTO EventParticipation (participant_id, event_id) VALUES (1, 1);
        RAISE EXCEPTION '联合主键未触发（EventParticipation）';
    EXCEPTION WHEN unique_violation THEN
        RAISE NOTICE 'PASS: PK composite -> EventParticipation';
    END;
END $$;

DO $$
BEGIN
    RAISE NOTICE '=== Step 7: 触发器业务约束（学生/教师互斥） ===';
    BEGIN
        INSERT INTO Teacher (people_id, staff_no, title, dept_id) VALUES (1, 'T-ROLE-1', '讲师', 1);
        RAISE EXCEPTION '触发器未触发（已是Student又插入Teacher）';
    EXCEPTION WHEN raise_exception THEN
        RAISE NOTICE 'PASS: Trigger -> Student cannot become Teacher directly';
    END;

    BEGIN
        INSERT INTO Student (people_id, student_no, grade, major, dep_id)
        VALUES (3, 'S-ROLE-3', '研一', '人工智能', 1);
        RAISE EXCEPTION '触发器未触发（已是Teacher又插入Student）';
    EXCEPTION WHEN raise_exception THEN
        RAISE NOTICE 'PASS: Trigger -> Teacher cannot become Student directly';
    END;
END $$;

DO $$
DECLARE
    v_user_pending INT;
    v_event_count INT;
BEGIN
    RAISE NOTICE '=== Step 8: 最终一致性抽查 ===';
    SELECT COUNT(*) INTO v_user_pending
    FROM SysUser
    WHERE username = 'user_stu_a' AND verification_status = 'pending';

    SELECT COUNT(*) INTO v_event_count FROM Event;

    IF v_user_pending <> 1 THEN
        RAISE EXCEPTION '最终抽查失败：默认值记录丢失';
    END IF;
    IF v_event_count < 2 THEN
        RAISE EXCEPTION '最终抽查失败：活动数据异常';
    END IF;

    RAISE NOTICE '全部约束链路已完成黑盒覆盖测试。';
END $$;

COMMIT;

-- 可选：查看剩余数据概况
SELECT 'Campus' AS table_name, COUNT(*) FROM Campus
UNION ALL SELECT 'Building', COUNT(*) FROM Building
UNION ALL SELECT 'Location', COUNT(*) FROM Location
UNION ALL SELECT 'People', COUNT(*) FROM People
UNION ALL SELECT 'Department', COUNT(*) FROM Department
UNION ALL SELECT 'Student', COUNT(*) FROM Student
UNION ALL SELECT 'Teacher', COUNT(*) FROM Teacher
UNION ALL SELECT 'SysUser', COUNT(*) FROM SysUser
UNION ALL SELECT 'Course', COUNT(*) FROM Course
UNION ALL SELECT 'Teaching', COUNT(*) FROM Teaching
UNION ALL SELECT 'Enrollment', COUNT(*) FROM Enrollment
UNION ALL SELECT 'Event', COUNT(*) FROM Event
UNION ALL SELECT 'EventParticipation', COUNT(*) FROM EventParticipation
UNION ALL SELECT 'QueryRecord', COUNT(*) FROM QueryRecord
ORDER BY table_name;
