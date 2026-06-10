-- 由 scripts/generate-fudan-campus-sql.mjs 根据 data/fudan-campus/fudan-campus-events.json 生成

-- 地点参考复旦公开信息；活动为演示数据组合。

-- - 复旦大学：访问复旦: https://www.fudan.edu.cn/453/list.htm

-- - 复旦大学基本建设处：校园地图: https://jijian.fudan.edu.cn/43607/list.htm

-- - 复旦大学图书馆：布局/开放时间: https://library.fudan.edu.cn/9/list.htm

-- - 复旦大学图书馆：图书借还: https://library.fudan.edu.cn/105/list.htm

-- - 复旦大学图书馆：院系资料室: https://library.fudan.edu.cn/47/list.htm

-- - 复旦大学总务处：联系我们: https://zongwuchu.fudan.edu.cn/39289/list.htm

-- - 复旦大学总务处：关于场地使用: https://zongwuchu.fudan.edu.cn/39412/list.htm

-- - 复旦大学：场馆设施: https://www.fudan.edu.cn/22/list.htm



BEGIN;



-- 1) 校区

INSERT INTO Campus (campus_name, address)
VALUES ('邯郸校区', '上海市杨浦区邯郸路220号')
ON CONFLICT (campus_name)
DO UPDATE SET address = EXCLUDED.address;

INSERT INTO Campus (campus_name, address)
VALUES ('江湾校区', '上海市杨浦区淞沪路2005号')
ON CONFLICT (campus_name)
DO UPDATE SET address = EXCLUDED.address;

INSERT INTO Campus (campus_name, address)
VALUES ('枫林校区', '上海市徐汇区医学院路138号')
ON CONFLICT (campus_name)
DO UPDATE SET address = EXCLUDED.address;

INSERT INTO Campus (campus_name, address)
VALUES ('张江校区', '上海市浦东新区张衡路825号')
ON CONFLICT (campus_name)
DO UPDATE SET address = EXCLUDED.address;



-- 2) 建筑

INSERT INTO Building (building_name, campus_id, building_type, description)
SELECT
  '光华楼',
  campus_id,
  '教学楼',
  '邯郸校区标志性教学与办公建筑，公开资料中出现光华楼东主楼、东辅楼等办公地点。'
FROM Campus
WHERE campus_name = '邯郸校区'
ON CONFLICT (building_name, campus_id)
DO UPDATE SET
  building_type = EXCLUDED.building_type,
  description = EXCLUDED.description;

INSERT INTO Building (building_name, campus_id, building_type, description)
SELECT
  '文科图书馆',
  campus_id,
  '图书馆',
  '复旦大学图书馆邯郸校区文科馆，包含参考阅览室、文学艺术书库等空间。'
FROM Campus
WHERE campus_name = '邯郸校区'
ON CONFLICT (building_name, campus_id)
DO UPDATE SET
  building_type = EXCLUDED.building_type,
  description = EXCLUDED.description;

INSERT INTO Building (building_name, campus_id, building_type, description)
SELECT
  '第三教学楼',
  campus_id,
  '教学楼',
  '总务处公开信息列为邯郸校区通宵自修教室所在教学楼。'
FROM Campus
WHERE campus_name = '邯郸校区'
ON CONFLICT (building_name, campus_id)
DO UPDATE SET
  building_type = EXCLUDED.building_type,
  description = EXCLUDED.description;

INSERT INTO Building (building_name, campus_id, building_type, description)
SELECT
  '第四教学楼',
  campus_id,
  '教学楼',
  '总务处一站式业务服务窗口所在建筑之一。'
FROM Campus
WHERE campus_name = '邯郸校区'
ON CONFLICT (building_name, campus_id)
DO UPDATE SET
  building_type = EXCLUDED.building_type,
  description = EXCLUDED.description;

INSERT INTO Building (building_name, campus_id, building_type, description)
SELECT
  '正大体育馆',
  campus_id,
  '体育设施',
  '邯郸校区南苑生活区综合性体育馆，可用于比赛、集会和文娱演出。'
FROM Campus
WHERE campus_name = '邯郸校区'
ON CONFLICT (building_name, campus_id)
DO UPDATE SET
  building_type = EXCLUDED.building_type,
  description = EXCLUDED.description;

INSERT INTO Building (building_name, campus_id, building_type, description)
SELECT
  '李兆基图书馆',
  campus_id,
  '图书馆',
  '复旦大学江湾馆，馆内包含人文艺术阅览室、文科借阅区、理科借阅区等空间。'
FROM Campus
WHERE campus_name = '江湾校区'
ON CONFLICT (building_name, campus_id)
DO UPDATE SET
  building_type = EXCLUDED.building_type,
  description = EXCLUDED.description;

INSERT INTO Building (building_name, campus_id, building_type, description)
SELECT
  '智华楼',
  campus_id,
  '教学楼',
  '江湾校区教学楼，总务处公开信息列有智华楼101、102通宵自修教室。'
FROM Campus
WHERE campus_name = '江湾校区'
ON CONFLICT (building_name, campus_id)
DO UPDATE SET
  building_type = EXCLUDED.building_type,
  description = EXCLUDED.description;

INSERT INTO Building (building_name, campus_id, building_type, description)
SELECT
  '廖凯原法学楼',
  campus_id,
  '教学楼',
  '江湾校区法学院相关建筑，江湾校区管委会公开联系方式中出现该楼位置。'
FROM Campus
WHERE campus_name = '江湾校区'
ON CONFLICT (building_name, campus_id)
DO UPDATE SET
  building_type = EXCLUDED.building_type,
  description = EXCLUDED.description;

INSERT INTO Building (building_name, campus_id, building_type, description)
SELECT
  '江湾校区综合体育馆',
  campus_id,
  '体育设施',
  '江湾校区综合体育馆，包含室内游泳馆、篮球场、羽毛球场等设施。'
FROM Campus
WHERE campus_name = '江湾校区'
ON CONFLICT (building_name, campus_id)
DO UPDATE SET
  building_type = EXCLUDED.building_type,
  description = EXCLUDED.description;

INSERT INTO Building (building_name, campus_id, building_type, description)
SELECT
  '江湾校区运动场',
  campus_id,
  '体育设施',
  '江湾校区室外运动场，公开信息列有足球场、篮球场、排球场和塑胶跑道。'
FROM Campus
WHERE campus_name = '江湾校区'
ON CONFLICT (building_name, campus_id)
DO UPDATE SET
  building_type = EXCLUDED.building_type,
  description = EXCLUDED.description;

INSERT INTO Building (building_name, campus_id, building_type, description)
SELECT
  '医科图书馆',
  campus_id,
  '图书馆',
  '复旦大学图书馆医科馆，公开信息包含24小时无人值守图书馆和医学图书区。'
FROM Campus
WHERE campus_name = '枫林校区'
ON CONFLICT (building_name, campus_id)
DO UPDATE SET
  building_type = EXCLUDED.building_type,
  description = EXCLUDED.description;

INSERT INTO Building (building_name, campus_id, building_type, description)
SELECT
  '第二教学楼',
  campus_id,
  '教学楼',
  '总务处公开信息列为枫林校区通宵自修教室所在教学楼。'
FROM Campus
WHERE campus_name = '枫林校区'
ON CONFLICT (building_name, campus_id)
DO UPDATE SET
  building_type = EXCLUDED.building_type,
  description = EXCLUDED.description;

INSERT INTO Building (building_name, campus_id, building_type, description)
SELECT
  '东三号楼',
  campus_id,
  '行政楼',
  '枫林校区总务一站式业务服务窗口和办事点相关建筑。'
FROM Campus
WHERE campus_name = '枫林校区'
ON CONFLICT (building_name, campus_id)
DO UPDATE SET
  building_type = EXCLUDED.building_type,
  description = EXCLUDED.description;

INSERT INTO Building (building_name, campus_id, building_type, description)
SELECT
  '枫林综合游泳馆',
  campus_id,
  '体育设施',
  '枫林校区综合游泳馆，公开信息列有室内游泳池、篮球馆、排球馆和健身房。'
FROM Campus
WHERE campus_name = '枫林校区'
ON CONFLICT (building_name, campus_id)
DO UPDATE SET
  building_type = EXCLUDED.building_type,
  description = EXCLUDED.description;

INSERT INTO Building (building_name, campus_id, building_type, description)
SELECT
  '计算机楼',
  campus_id,
  '教学楼',
  '张江图书馆读者服务中心所在建筑，公开信息列有计算机楼101阶梯教室。'
FROM Campus
WHERE campus_name = '张江校区'
ON CONFLICT (building_name, campus_id)
DO UPDATE SET
  building_type = EXCLUDED.building_type,
  description = EXCLUDED.description;

INSERT INTO Building (building_name, campus_id, building_type, description)
SELECT
  '第二教学楼',
  campus_id,
  '教学楼',
  '总务处公开信息列为张江校区通宵自修教室所在教学楼。'
FROM Campus
WHERE campus_name = '张江校区'
ON CONFLICT (building_name, campus_id)
DO UPDATE SET
  building_type = EXCLUDED.building_type,
  description = EXCLUDED.description;

INSERT INTO Building (building_name, campus_id, building_type, description)
SELECT
  '3号科研楼',
  campus_id,
  '实验楼',
  '张江校区总务办事点所在建筑。'
FROM Campus
WHERE campus_name = '张江校区'
ON CONFLICT (building_name, campus_id)
DO UPDATE SET
  building_type = EXCLUDED.building_type,
  description = EXCLUDED.description;

INSERT INTO Building (building_name, campus_id, building_type, description)
SELECT
  '张江校区学生食堂',
  campus_id,
  '食堂楼',
  '张江图书馆公开信息列有张江校区食堂二楼自习空间。'
FROM Campus
WHERE campus_name = '张江校区'
ON CONFLICT (building_name, campus_id)
DO UPDATE SET
  building_type = EXCLUDED.building_type,
  description = EXCLUDED.description;

INSERT INTO Building (building_name, campus_id, building_type, description)
SELECT
  '张江校区体育馆',
  campus_id,
  '体育设施',
  '张江校区综合性体育馆，公开信息列有篮球、羽毛球、乒乓球和健身房等项目。'
FROM Campus
WHERE campus_name = '张江校区'
ON CONFLICT (building_name, campus_id)
DO UPDATE SET
  building_type = EXCLUDED.building_type,
  description = EXCLUDED.description;



-- 3) 地点

INSERT INTO Location (location_name, building_id, facility_type, description, open_time)
SELECT
  '光华楼东主楼901',
  b.building_id,
  '办公室',
  '国际文化交流学院资料室相关地点，可作为小型交流或咨询空间演示数据。',
  '周一至周五 08:00-17:00'
FROM Building b
JOIN Campus c ON c.campus_id = b.campus_id
WHERE c.campus_name = '邯郸校区'
  AND b.building_name = '光华楼'
ON CONFLICT (location_name, building_id)
DO UPDATE SET
  facility_type = EXCLUDED.facility_type,
  description = EXCLUDED.description,
  open_time = EXCLUDED.open_time;

INSERT INTO Location (location_name, building_id, facility_type, description, open_time)
SELECT
  '光华楼东主楼2609',
  b.building_id,
  '办公室',
  '航空航天系资料室相关地点，可作为院系咨询空间演示数据。',
  '周一至周五 09:00-17:00'
FROM Building b
JOIN Campus c ON c.campus_id = b.campus_id
WHERE c.campus_name = '邯郸校区'
  AND b.building_name = '光华楼'
ON CONFLICT (location_name, building_id)
DO UPDATE SET
  facility_type = EXCLUDED.facility_type,
  description = EXCLUDED.description,
  open_time = EXCLUDED.open_time;

INSERT INTO Location (location_name, building_id, facility_type, description, open_time)
SELECT
  '光华楼东辅楼602',
  b.building_id,
  '办公室',
  '奥地利研究中心资料室相关地点。',
  '周一、周二、周四、周五部分时段开放'
FROM Building b
JOIN Campus c ON c.campus_id = b.campus_id
WHERE c.campus_name = '邯郸校区'
  AND b.building_name = '光华楼'
ON CONFLICT (location_name, building_id)
DO UPDATE SET
  facility_type = EXCLUDED.facility_type,
  description = EXCLUDED.description,
  open_time = EXCLUDED.open_time;

INSERT INTO Location (location_name, building_id, facility_type, description, open_time)
SELECT
  '参考阅览室411',
  b.building_id,
  '图书馆',
  '文科图书馆参考阅览室，收藏人文、社科类及港台图书。',
  '周一至周日 08:00-22:00'
FROM Building b
JOIN Campus c ON c.campus_id = b.campus_id
WHERE c.campus_name = '邯郸校区'
  AND b.building_name = '文科图书馆'
ON CONFLICT (location_name, building_id)
DO UPDATE SET
  facility_type = EXCLUDED.facility_type,
  description = EXCLUDED.description,
  open_time = EXCLUDED.open_time;

INSERT INTO Location (location_name, building_id, facility_type, description, open_time)
SELECT
  '文学艺术书库410',
  b.building_id,
  '图书馆',
  '文科图书馆文学艺术类图书开架借阅空间。',
  '周一至周日 08:00-22:00'
FROM Building b
JOIN Campus c ON c.campus_id = b.campus_id
WHERE c.campus_name = '邯郸校区'
  AND b.building_name = '文科图书馆'
ON CONFLICT (location_name, building_id)
DO UPDATE SET
  facility_type = EXCLUDED.facility_type,
  description = EXCLUDED.description,
  open_time = EXCLUDED.open_time;

INSERT INTO Location (location_name, building_id, facility_type, description, open_time)
SELECT
  '第三教学楼3106',
  b.building_id,
  '自习室',
  '邯郸校区通宵自修教室之一。',
  '每学期第三周起通宵开放，法定节假日暂停'
FROM Building b
JOIN Campus c ON c.campus_id = b.campus_id
WHERE c.campus_name = '邯郸校区'
  AND b.building_name = '第三教学楼'
ON CONFLICT (location_name, building_id)
DO UPDATE SET
  facility_type = EXCLUDED.facility_type,
  description = EXCLUDED.description,
  open_time = EXCLUDED.open_time;

INSERT INTO Location (location_name, building_id, facility_type, description, open_time)
SELECT
  '第三教学楼3109',
  b.building_id,
  '自习室',
  '邯郸校区通宵自修教室之一。',
  '每学期第三周起通宵开放，法定节假日暂停'
FROM Building b
JOIN Campus c ON c.campus_id = b.campus_id
WHERE c.campus_name = '邯郸校区'
  AND b.building_name = '第三教学楼'
ON CONFLICT (location_name, building_id)
DO UPDATE SET
  facility_type = EXCLUDED.facility_type,
  description = EXCLUDED.description,
  open_time = EXCLUDED.open_time;

INSERT INTO Location (location_name, building_id, facility_type, description, open_time)
SELECT
  '第四教学楼南侧服务窗口',
  b.building_id,
  '办公室',
  '校园生活服务平台总务处一站式业务服务窗口。',
  '每日 08:00-20:00'
FROM Building b
JOIN Campus c ON c.campus_id = b.campus_id
WHERE c.campus_name = '邯郸校区'
  AND b.building_name = '第四教学楼'
ON CONFLICT (location_name, building_id)
DO UPDATE SET
  facility_type = EXCLUDED.facility_type,
  description = EXCLUDED.description,
  open_time = EXCLUDED.open_time;

INSERT INTO Location (location_name, building_id, facility_type, description, open_time)
SELECT
  '正大体育馆主场馆',
  b.building_id,
  '运动场地',
  '可用于篮球、排球、羽毛球、文娱演出和大型会议的综合场馆。',
  '06:30-22:30'
FROM Building b
JOIN Campus c ON c.campus_id = b.campus_id
WHERE c.campus_name = '邯郸校区'
  AND b.building_name = '正大体育馆'
ON CONFLICT (location_name, building_id)
DO UPDATE SET
  facility_type = EXCLUDED.facility_type,
  description = EXCLUDED.description,
  open_time = EXCLUDED.open_time;

INSERT INTO Location (location_name, building_id, facility_type, description, open_time)
SELECT
  '人文艺术阅览室B106',
  b.building_id,
  '图书馆',
  '江湾馆人文艺术阅览室，收藏文学、艺术类图书。',
  '周一至周日 08:00-22:00'
FROM Building b
JOIN Campus c ON c.campus_id = b.campus_id
WHERE c.campus_name = '江湾校区'
  AND b.building_name = '李兆基图书馆'
ON CONFLICT (location_name, building_id)
DO UPDATE SET
  facility_type = EXCLUDED.facility_type,
  description = EXCLUDED.description,
  open_time = EXCLUDED.open_time;

INSERT INTO Location (location_name, building_id, facility_type, description, open_time)
SELECT
  '文科借阅区B206',
  b.building_id,
  '图书馆',
  '江湾馆文科借阅区，收藏政治、法律类中外文图书。',
  '周一至周日 08:00-22:00'
FROM Building b
JOIN Campus c ON c.campus_id = b.campus_id
WHERE c.campus_name = '江湾校区'
  AND b.building_name = '李兆基图书馆'
ON CONFLICT (location_name, building_id)
DO UPDATE SET
  facility_type = EXCLUDED.facility_type,
  description = EXCLUDED.description,
  open_time = EXCLUDED.open_time;

INSERT INTO Location (location_name, building_id, facility_type, description, open_time)
SELECT
  '理科借阅区B304-B306',
  b.building_id,
  '图书馆',
  '江湾馆理科借阅区，以生物科学、计算机类图书为主。',
  '周一至周日 08:00-22:00'
FROM Building b
JOIN Campus c ON c.campus_id = b.campus_id
WHERE c.campus_name = '江湾校区'
  AND b.building_name = '李兆基图书馆'
ON CONFLICT (location_name, building_id)
DO UPDATE SET
  facility_type = EXCLUDED.facility_type,
  description = EXCLUDED.description,
  open_time = EXCLUDED.open_time;

INSERT INTO Location (location_name, building_id, facility_type, description, open_time)
SELECT
  '智华楼101',
  b.building_id,
  '教室',
  '江湾校区通宵自修教室之一。',
  '每学期第三周起通宵开放，法定节假日暂停'
FROM Building b
JOIN Campus c ON c.campus_id = b.campus_id
WHERE c.campus_name = '江湾校区'
  AND b.building_name = '智华楼'
ON CONFLICT (location_name, building_id)
DO UPDATE SET
  facility_type = EXCLUDED.facility_type,
  description = EXCLUDED.description,
  open_time = EXCLUDED.open_time;

INSERT INTO Location (location_name, building_id, facility_type, description, open_time)
SELECT
  '智华楼102',
  b.building_id,
  '教室',
  '江湾校区通宵自修教室之一。',
  '每学期第三周起通宵开放，法定节假日暂停'
FROM Building b
JOIN Campus c ON c.campus_id = b.campus_id
WHERE c.campus_name = '江湾校区'
  AND b.building_name = '智华楼'
ON CONFLICT (location_name, building_id)
DO UPDATE SET
  facility_type = EXCLUDED.facility_type,
  description = EXCLUDED.description,
  open_time = EXCLUDED.open_time;

INSERT INTO Location (location_name, building_id, facility_type, description, open_time)
SELECT
  '廖凯原法学楼南二楼',
  b.building_id,
  '办公室',
  '江湾校区管理委员会公开联系方式中的办公地点。',
  '周一至周五 08:30-17:00'
FROM Building b
JOIN Campus c ON c.campus_id = b.campus_id
WHERE c.campus_name = '江湾校区'
  AND b.building_name = '廖凯原法学楼'
ON CONFLICT (location_name, building_id)
DO UPDATE SET
  facility_type = EXCLUDED.facility_type,
  description = EXCLUDED.description,
  open_time = EXCLUDED.open_time;

INSERT INTO Location (location_name, building_id, facility_type, description, open_time)
SELECT
  '综合体育馆篮球场',
  b.building_id,
  '运动场地',
  '江湾校区综合体育馆内篮球活动空间。',
  '以场馆预约开放时间为准'
FROM Building b
JOIN Campus c ON c.campus_id = b.campus_id
WHERE c.campus_name = '江湾校区'
  AND b.building_name = '江湾校区综合体育馆'
ON CONFLICT (location_name, building_id)
DO UPDATE SET
  facility_type = EXCLUDED.facility_type,
  description = EXCLUDED.description,
  open_time = EXCLUDED.open_time;

INSERT INTO Location (location_name, building_id, facility_type, description, open_time)
SELECT
  '综合体育馆羽毛球场',
  b.building_id,
  '运动场地',
  '江湾校区综合体育馆内羽毛球活动空间。',
  '以场馆预约开放时间为准'
FROM Building b
JOIN Campus c ON c.campus_id = b.campus_id
WHERE c.campus_name = '江湾校区'
  AND b.building_name = '江湾校区综合体育馆'
ON CONFLICT (location_name, building_id)
DO UPDATE SET
  facility_type = EXCLUDED.facility_type,
  description = EXCLUDED.description,
  open_time = EXCLUDED.open_time;

INSERT INTO Location (location_name, building_id, facility_type, description, open_time)
SELECT
  '江湾运动场田径区',
  b.building_id,
  '运动场地',
  '江湾校区室外运动场，含塑胶跑道和热身区域。',
  '07:00-22:00'
FROM Building b
JOIN Campus c ON c.campus_id = b.campus_id
WHERE c.campus_name = '江湾校区'
  AND b.building_name = '江湾校区运动场'
ON CONFLICT (location_name, building_id)
DO UPDATE SET
  facility_type = EXCLUDED.facility_type,
  description = EXCLUDED.description,
  open_time = EXCLUDED.open_time;

INSERT INTO Location (location_name, building_id, facility_type, description, open_time)
SELECT
  '24h无人值守图书馆B1',
  b.building_id,
  '图书馆',
  '医科馆B1楼24小时无人值守图书馆。',
  '24小时'
FROM Building b
JOIN Campus c ON c.campus_id = b.campus_id
WHERE c.campus_name = '枫林校区'
  AND b.building_name = '医科图书馆'
ON CONFLICT (location_name, building_id)
DO UPDATE SET
  facility_type = EXCLUDED.facility_type,
  description = EXCLUDED.description,
  open_time = EXCLUDED.open_time;

INSERT INTO Location (location_name, building_id, facility_type, description, open_time)
SELECT
  '医科馆中文图书区3楼',
  b.building_id,
  '图书馆',
  '医科馆中文图书区，收藏生物医学及其他学科中文图书。',
  '周一至周日 08:00-22:00'
FROM Building b
JOIN Campus c ON c.campus_id = b.campus_id
WHERE c.campus_name = '枫林校区'
  AND b.building_name = '医科图书馆'
ON CONFLICT (location_name, building_id)
DO UPDATE SET
  facility_type = EXCLUDED.facility_type,
  description = EXCLUDED.description,
  open_time = EXCLUDED.open_time;

INSERT INTO Location (location_name, building_id, facility_type, description, open_time)
SELECT
  '医科馆外文图书区4楼',
  b.building_id,
  '图书馆',
  '医科馆外文图书区，以生物医学外文图书为主。',
  '周一至周日 08:00-22:00'
FROM Building b
JOIN Campus c ON c.campus_id = b.campus_id
WHERE c.campus_name = '枫林校区'
  AND b.building_name = '医科图书馆'
ON CONFLICT (location_name, building_id)
DO UPDATE SET
  facility_type = EXCLUDED.facility_type,
  description = EXCLUDED.description,
  open_time = EXCLUDED.open_time;

INSERT INTO Location (location_name, building_id, facility_type, description, open_time)
SELECT
  '第二教学楼2201',
  b.building_id,
  '教室',
  '枫林校区通宵自修教室之一。',
  '每学期第三周起通宵开放，法定节假日暂停'
FROM Building b
JOIN Campus c ON c.campus_id = b.campus_id
WHERE c.campus_name = '枫林校区'
  AND b.building_name = '第二教学楼'
ON CONFLICT (location_name, building_id)
DO UPDATE SET
  facility_type = EXCLUDED.facility_type,
  description = EXCLUDED.description,
  open_time = EXCLUDED.open_time;

INSERT INTO Location (location_name, building_id, facility_type, description, open_time)
SELECT
  '第二教学楼2202',
  b.building_id,
  '教室',
  '枫林校区通宵自修教室之一。',
  '每学期第三周起通宵开放，法定节假日暂停'
FROM Building b
JOIN Campus c ON c.campus_id = b.campus_id
WHERE c.campus_name = '枫林校区'
  AND b.building_name = '第二教学楼'
ON CONFLICT (location_name, building_id)
DO UPDATE SET
  facility_type = EXCLUDED.facility_type,
  description = EXCLUDED.description,
  open_time = EXCLUDED.open_time;

INSERT INTO Location (location_name, building_id, facility_type, description, open_time)
SELECT
  '东三号楼西侧服务窗口',
  b.building_id,
  '办公室',
  '校园生活服务平台总务处一站式业务服务窗口。',
  '每日 08:00-20:00'
FROM Building b
JOIN Campus c ON c.campus_id = b.campus_id
WHERE c.campus_name = '枫林校区'
  AND b.building_name = '东三号楼'
ON CONFLICT (location_name, building_id)
DO UPDATE SET
  facility_type = EXCLUDED.facility_type,
  description = EXCLUDED.description,
  open_time = EXCLUDED.open_time;

INSERT INTO Location (location_name, building_id, facility_type, description, open_time)
SELECT
  '综合游泳馆室内泳池',
  b.building_id,
  '运动场地',
  '枫林综合游泳馆室内游泳池。',
  '以场馆开放通知为准'
FROM Building b
JOIN Campus c ON c.campus_id = b.campus_id
WHERE c.campus_name = '枫林校区'
  AND b.building_name = '枫林综合游泳馆'
ON CONFLICT (location_name, building_id)
DO UPDATE SET
  facility_type = EXCLUDED.facility_type,
  description = EXCLUDED.description,
  open_time = EXCLUDED.open_time;

INSERT INTO Location (location_name, building_id, facility_type, description, open_time)
SELECT
  '综合游泳馆篮球馆',
  b.building_id,
  '运动场地',
  '枫林综合游泳馆内篮球活动空间。',
  '以场馆开放通知为准'
FROM Building b
JOIN Campus c ON c.campus_id = b.campus_id
WHERE c.campus_name = '枫林校区'
  AND b.building_name = '枫林综合游泳馆'
ON CONFLICT (location_name, building_id)
DO UPDATE SET
  facility_type = EXCLUDED.facility_type,
  description = EXCLUDED.description,
  open_time = EXCLUDED.open_time;

INSERT INTO Location (location_name, building_id, facility_type, description, open_time)
SELECT
  '计算机楼101阶梯教室',
  b.building_id,
  '图书馆',
  '张江图书馆读者服务中心所在空间。',
  '周一至周日 08:00-22:00'
FROM Building b
JOIN Campus c ON c.campus_id = b.campus_id
WHERE c.campus_name = '张江校区'
  AND b.building_name = '计算机楼'
ON CONFLICT (location_name, building_id)
DO UPDATE SET
  facility_type = EXCLUDED.facility_type,
  description = EXCLUDED.description,
  open_time = EXCLUDED.open_time;

INSERT INTO Location (location_name, building_id, facility_type, description, open_time)
SELECT
  '第二教学楼2304',
  b.building_id,
  '教室',
  '张江校区通宵自修教室之一。',
  '每学期第三周起通宵开放，法定节假日暂停'
FROM Building b
JOIN Campus c ON c.campus_id = b.campus_id
WHERE c.campus_name = '张江校区'
  AND b.building_name = '第二教学楼'
ON CONFLICT (location_name, building_id)
DO UPDATE SET
  facility_type = EXCLUDED.facility_type,
  description = EXCLUDED.description,
  open_time = EXCLUDED.open_time;

INSERT INTO Location (location_name, building_id, facility_type, description, open_time)
SELECT
  '第二教学楼2306',
  b.building_id,
  '教室',
  '张江校区通宵自修教室之一。',
  '每学期第三周起通宵开放，法定节假日暂停'
FROM Building b
JOIN Campus c ON c.campus_id = b.campus_id
WHERE c.campus_name = '张江校区'
  AND b.building_name = '第二教学楼'
ON CONFLICT (location_name, building_id)
DO UPDATE SET
  facility_type = EXCLUDED.facility_type,
  description = EXCLUDED.description,
  open_time = EXCLUDED.open_time;

INSERT INTO Location (location_name, building_id, facility_type, description, open_time)
SELECT
  '3号科研楼317',
  b.building_id,
  '办公室',
  '张江校区总务办事点。',
  '周一至周五 08:00-11:30 13:30-17:00'
FROM Building b
JOIN Campus c ON c.campus_id = b.campus_id
WHERE c.campus_name = '张江校区'
  AND b.building_name = '3号科研楼'
ON CONFLICT (location_name, building_id)
DO UPDATE SET
  facility_type = EXCLUDED.facility_type,
  description = EXCLUDED.description,
  open_time = EXCLUDED.open_time;

INSERT INTO Location (location_name, building_id, facility_type, description, open_time)
SELECT
  '食堂二楼自习空间',
  b.building_id,
  '自习室',
  '张江馆公开信息列出的张江校区食堂二楼自习空间。',
  '周一至周日 08:00-22:00，考试周适当延长'
FROM Building b
JOIN Campus c ON c.campus_id = b.campus_id
WHERE c.campus_name = '张江校区'
  AND b.building_name = '张江校区学生食堂'
ON CONFLICT (location_name, building_id)
DO UPDATE SET
  facility_type = EXCLUDED.facility_type,
  description = EXCLUDED.description,
  open_time = EXCLUDED.open_time;

INSERT INTO Location (location_name, building_id, facility_type, description, open_time)
SELECT
  '体育馆篮球场',
  b.building_id,
  '运动场地',
  '张江校区体育馆篮球活动空间。',
  '以场馆预约开放时间为准'
FROM Building b
JOIN Campus c ON c.campus_id = b.campus_id
WHERE c.campus_name = '张江校区'
  AND b.building_name = '张江校区体育馆'
ON CONFLICT (location_name, building_id)
DO UPDATE SET
  facility_type = EXCLUDED.facility_type,
  description = EXCLUDED.description,
  open_time = EXCLUDED.open_time;

INSERT INTO Location (location_name, building_id, facility_type, description, open_time)
SELECT
  '体育馆羽毛球场',
  b.building_id,
  '运动场地',
  '张江校区体育馆羽毛球活动空间。',
  '以场馆预约开放时间为准'
FROM Building b
JOIN Campus c ON c.campus_id = b.campus_id
WHERE c.campus_name = '张江校区'
  AND b.building_name = '张江校区体育馆'
ON CONFLICT (location_name, building_id)
DO UPDATE SET
  facility_type = EXCLUDED.facility_type,
  description = EXCLUDED.description,
  open_time = EXCLUDED.open_time;



-- 4) 活动：Event 没有业务唯一约束，按活动名清理后重建，避免重复导入。

DELETE FROM Event WHERE event_name IN (
  '数据库系统项目展示会',
  '图书馆数字资源检索工作坊',
  '校园服务志愿者培训',
  '正大体育馆新生杯篮球赛',
  '江湾交叉学科AI学术沙龙',
  '法学与社会治理论坛',
  '李兆基图书馆研究方法工作坊',
  '江湾体育馆羽毛球公开课',
  '江湾夜跑与健康打卡',
  '枫林医学人文讲座',
  '公共卫生数据论坛',
  '枫林游泳安全培训',
  '张江创新药学术交流会',
  '微电子行业招聘宣讲会',
  '张江羽毛球交流赛',
  '跨校区图书馆使用导览'
);



INSERT INTO Event (event_name, event_type, start_time, end_time, location_id, host_dep_id, description)
SELECT
  '数据库系统项目展示会',
  '论坛',
  '2026-09-18 14:00:00'::timestamp,
  '2026-09-18 16:30:00'::timestamp,
  l.location_id,
  (SELECT dep_id FROM Department WHERE dep_name = '计算机科学技术学院'),
  '围绕课程项目展示、关系数据库设计和校园问答系统实践进行交流。'
FROM Location l
JOIN Building b ON b.building_id = l.building_id
JOIN Campus c ON c.campus_id = b.campus_id
WHERE c.campus_name = '邯郸校区'
  AND b.building_name = '光华楼'
  AND l.location_name = '光华楼东主楼901';

INSERT INTO Event (event_name, event_type, start_time, end_time, location_id, host_dep_id, description)
SELECT
  '图书馆数字资源检索工作坊',
  '讲座',
  '2026-09-22 19:00:00'::timestamp,
  '2026-09-22 20:30:00'::timestamp,
  l.location_id,
  (SELECT dep_id FROM Department WHERE dep_name = '学生事务中心'),
  '面向新生介绍图书馆目录、数据库检索和文献传递服务。'
FROM Location l
JOIN Building b ON b.building_id = l.building_id
JOIN Campus c ON c.campus_id = b.campus_id
WHERE c.campus_name = '邯郸校区'
  AND b.building_name = '文科图书馆'
  AND l.location_name = '参考阅览室411';

INSERT INTO Event (event_name, event_type, start_time, end_time, location_id, host_dep_id, description)
SELECT
  '校园服务志愿者培训',
  '志愿服务',
  '2026-09-25 13:30:00'::timestamp,
  '2026-09-25 15:00:00'::timestamp,
  l.location_id,
  (SELECT dep_id FROM Department WHERE dep_name = '学生事务中心'),
  '讲解校园服务窗口导引、失物咨询和跨校区事务协助流程。'
FROM Location l
JOIN Building b ON b.building_id = l.building_id
JOIN Campus c ON c.campus_id = b.campus_id
WHERE c.campus_name = '邯郸校区'
  AND b.building_name = '第四教学楼'
  AND l.location_name = '第四教学楼南侧服务窗口';

INSERT INTO Event (event_name, event_type, start_time, end_time, location_id, host_dep_id, description)
SELECT
  '正大体育馆新生杯篮球赛',
  '体育赛事',
  '2026-10-10 18:30:00'::timestamp,
  '2026-10-10 20:30:00'::timestamp,
  l.location_id,
  (SELECT dep_id FROM Department WHERE dep_name = '学生事务中心'),
  '面向各院系新生队伍的校园篮球交流赛。'
FROM Location l
JOIN Building b ON b.building_id = l.building_id
JOIN Campus c ON c.campus_id = b.campus_id
WHERE c.campus_name = '邯郸校区'
  AND b.building_name = '正大体育馆'
  AND l.location_name = '正大体育馆主场馆';

INSERT INTO Event (event_name, event_type, start_time, end_time, location_id, host_dep_id, description)
SELECT
  '江湾交叉学科AI学术沙龙',
  '学术交流',
  '2026-10-14 15:00:00'::timestamp,
  '2026-10-14 17:00:00'::timestamp,
  l.location_id,
  (SELECT dep_id FROM Department WHERE dep_name = '计算机科学技术学院'),
  '讨论人工智能在生命科学、材料科学和法学研究中的交叉应用。'
FROM Location l
JOIN Building b ON b.building_id = l.building_id
JOIN Campus c ON c.campus_id = b.campus_id
WHERE c.campus_name = '江湾校区'
  AND b.building_name = '智华楼'
  AND l.location_name = '智华楼101';

INSERT INTO Event (event_name, event_type, start_time, end_time, location_id, host_dep_id, description)
SELECT
  '法学与社会治理论坛',
  '论坛',
  '2026-10-21 14:00:00'::timestamp,
  '2026-10-21 16:00:00'::timestamp,
  l.location_id,
  (SELECT dep_id FROM Department WHERE dep_name = '学生事务中心'),
  '围绕校园治理、公共服务和学生权益议题开展圆桌讨论。'
FROM Location l
JOIN Building b ON b.building_id = l.building_id
JOIN Campus c ON c.campus_id = b.campus_id
WHERE c.campus_name = '江湾校区'
  AND b.building_name = '廖凯原法学楼'
  AND l.location_name = '廖凯原法学楼南二楼';

INSERT INTO Event (event_name, event_type, start_time, end_time, location_id, host_dep_id, description)
SELECT
  '李兆基图书馆研究方法工作坊',
  '讲座',
  '2026-10-27 19:00:00'::timestamp,
  '2026-10-27 20:30:00'::timestamp,
  l.location_id,
  (SELECT dep_id FROM Department WHERE dep_name = '学生事务中心'),
  '介绍政治法律类文献检索、论文选题和资料管理方法。'
FROM Location l
JOIN Building b ON b.building_id = l.building_id
JOIN Campus c ON c.campus_id = b.campus_id
WHERE c.campus_name = '江湾校区'
  AND b.building_name = '李兆基图书馆'
  AND l.location_name = '文科借阅区B206';

INSERT INTO Event (event_name, event_type, start_time, end_time, location_id, host_dep_id, description)
SELECT
  '江湾体育馆羽毛球公开课',
  '体育赛事',
  '2026-11-01 10:00:00'::timestamp,
  '2026-11-01 12:00:00'::timestamp,
  l.location_id,
  (SELECT dep_id FROM Department WHERE dep_name = '学生事务中心'),
  '面向零基础同学的羽毛球体验课和分组练习。'
FROM Location l
JOIN Building b ON b.building_id = l.building_id
JOIN Campus c ON c.campus_id = b.campus_id
WHERE c.campus_name = '江湾校区'
  AND b.building_name = '江湾校区综合体育馆'
  AND l.location_name = '综合体育馆羽毛球场';

INSERT INTO Event (event_name, event_type, start_time, end_time, location_id, host_dep_id, description)
SELECT
  '江湾夜跑与健康打卡',
  '体育赛事',
  '2026-11-06 19:00:00'::timestamp,
  '2026-11-06 20:30:00'::timestamp,
  l.location_id,
  (SELECT dep_id FROM Department WHERE dep_name = '学生事务中心'),
  '围绕运动场开展夜跑、拉伸和健康打卡活动。'
FROM Location l
JOIN Building b ON b.building_id = l.building_id
JOIN Campus c ON c.campus_id = b.campus_id
WHERE c.campus_name = '江湾校区'
  AND b.building_name = '江湾校区运动场'
  AND l.location_name = '江湾运动场田径区';

INSERT INTO Event (event_name, event_type, start_time, end_time, location_id, host_dep_id, description)
SELECT
  '枫林医学人文讲座',
  '讲座',
  '2026-11-12 18:30:00'::timestamp,
  '2026-11-12 20:00:00'::timestamp,
  l.location_id,
  (SELECT dep_id FROM Department WHERE dep_name = '学生事务中心'),
  '结合医学阅读材料讨论医患沟通、叙事医学和职业伦理。'
FROM Location l
JOIN Building b ON b.building_id = l.building_id
JOIN Campus c ON c.campus_id = b.campus_id
WHERE c.campus_name = '枫林校区'
  AND b.building_name = '医科图书馆'
  AND l.location_name = '医科馆中文图书区3楼';

INSERT INTO Event (event_name, event_type, start_time, end_time, location_id, host_dep_id, description)
SELECT
  '公共卫生数据论坛',
  '论坛',
  '2026-11-18 14:00:00'::timestamp,
  '2026-11-18 16:00:00'::timestamp,
  l.location_id,
  (SELECT dep_id FROM Department WHERE dep_name = '计算机科学技术学院'),
  '面向医学与计算交叉方向，交流公共卫生数据治理与可视化实践。'
FROM Location l
JOIN Building b ON b.building_id = l.building_id
JOIN Campus c ON c.campus_id = b.campus_id
WHERE c.campus_name = '枫林校区'
  AND b.building_name = '第二教学楼'
  AND l.location_name = '第二教学楼2201';

INSERT INTO Event (event_name, event_type, start_time, end_time, location_id, host_dep_id, description)
SELECT
  '枫林游泳安全培训',
  '志愿服务',
  '2026-11-21 09:30:00'::timestamp,
  '2026-11-21 11:00:00'::timestamp,
  l.location_id,
  (SELECT dep_id FROM Department WHERE dep_name = '学生事务中心'),
  '开展游泳安全、场馆秩序和应急互助培训。'
FROM Location l
JOIN Building b ON b.building_id = l.building_id
JOIN Campus c ON c.campus_id = b.campus_id
WHERE c.campus_name = '枫林校区'
  AND b.building_name = '枫林综合游泳馆'
  AND l.location_name = '综合游泳馆室内泳池';

INSERT INTO Event (event_name, event_type, start_time, end_time, location_id, host_dep_id, description)
SELECT
  '张江创新药学术交流会',
  '学术交流',
  '2026-11-26 15:00:00'::timestamp,
  '2026-11-26 17:00:00'::timestamp,
  l.location_id,
  (SELECT dep_id FROM Department WHERE dep_name = '计算机科学技术学院'),
  '围绕新药研发中的数据平台、知识图谱和智能检索进行交流。'
FROM Location l
JOIN Building b ON b.building_id = l.building_id
JOIN Campus c ON c.campus_id = b.campus_id
WHERE c.campus_name = '张江校区'
  AND b.building_name = '计算机楼'
  AND l.location_name = '计算机楼101阶梯教室';

INSERT INTO Event (event_name, event_type, start_time, end_time, location_id, host_dep_id, description)
SELECT
  '微电子行业招聘宣讲会',
  '招聘宣讲',
  '2026-12-02 18:30:00'::timestamp,
  '2026-12-02 20:30:00'::timestamp,
  l.location_id,
  (SELECT dep_id FROM Department WHERE dep_name = '学生事务中心'),
  '邀请企业介绍芯片设计、EDA、嵌入式系统相关岗位与实习机会。'
FROM Location l
JOIN Building b ON b.building_id = l.building_id
JOIN Campus c ON c.campus_id = b.campus_id
WHERE c.campus_name = '张江校区'
  AND b.building_name = '第二教学楼'
  AND l.location_name = '第二教学楼2304';

INSERT INTO Event (event_name, event_type, start_time, end_time, location_id, host_dep_id, description)
SELECT
  '张江羽毛球交流赛',
  '体育赛事',
  '2026-12-06 14:00:00'::timestamp,
  '2026-12-06 17:00:00'::timestamp,
  l.location_id,
  (SELECT dep_id FROM Department WHERE dep_name = '学生事务中心'),
  '面向张江校区师生的双打交流赛。'
FROM Location l
JOIN Building b ON b.building_id = l.building_id
JOIN Campus c ON c.campus_id = b.campus_id
WHERE c.campus_name = '张江校区'
  AND b.building_name = '张江校区体育馆'
  AND l.location_name = '体育馆羽毛球场';

INSERT INTO Event (event_name, event_type, start_time, end_time, location_id, host_dep_id, description)
SELECT
  '跨校区图书馆使用导览',
  '志愿服务',
  '2026-12-09 19:00:00'::timestamp,
  '2026-12-09 20:00:00'::timestamp,
  l.location_id,
  (SELECT dep_id FROM Department WHERE dep_name = '学生事务中心'),
  '介绍文科馆、江湾馆、医科馆和张江服务点的借阅与自习资源。'
FROM Location l
JOIN Building b ON b.building_id = l.building_id
JOIN Campus c ON c.campus_id = b.campus_id
WHERE c.campus_name = '张江校区'
  AND b.building_name = '张江校区学生食堂'
  AND l.location_name = '食堂二楼自习空间';



COMMIT;

