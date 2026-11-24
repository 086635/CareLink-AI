/* eslint-disable */
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { createHash } = require('crypto');

const SALT = process.env.DEVICE_KEY_SALT || 'carelink-local-demo-salt';

function hashDeviceKey(key) {
  return createHash('sha256').update(`${SALT}:${key}`).digest('hex');
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DATABASE_HOST || '127.0.0.1',
    port: Number(process.env.DATABASE_PORT || 3306),
    user: process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME || 'carelink',
  });

  const [orgRows] = await conn.query("SELECT id FROM organization WHERE name='演示养老院' LIMIT 1");
  if (orgRows.length > 0) {
    console.log('种子数据已存在，跳过（如需重建请先 DROP DATABASE carelink）');
    await conn.end();
    return;
  }

  await conn.query("INSERT INTO organization (name, status) VALUES ('演示养老院', 'ENABLED')");
  const [[org]] = await conn.query('SELECT id FROM organization ORDER BY id DESC LIMIT 1');
  const orgId = org.id;
  console.log(`机构已创建: id=${orgId}`);

  const accounts = [
    { name: '管理员', account: 'admin', password: 'admin123', role: 'ADM', phone: '13800000001' },
    { name: '陈主管', account: 'sup', password: 'sup123456', role: 'SUP', phone: '13800000002' },
    { name: '小刘', account: 'cg1', password: 'cg123456', role: 'CG', phone: '13800000003' },
    { name: '小赵', account: 'cg2', password: 'cg123456', role: 'CG', phone: '13800000004' },
  ];
  for (const a of accounts) {
    const hash = await bcrypt.hash(a.password, 10);
    await conn.query(
      'INSERT INTO caregiver (org_id, name, phone, account, password_hash, role, on_duty, status) VALUES (?,?,?,?,?,?,1,?)',
      [orgId, a.name, a.phone, a.account, hash, a.role, 'ACTIVE'],
    );
  }
  console.log('账号已创建: admin/admin123(ADM) sup/sup123456(SUP) cg1/cg123456 cg2/cg123456 (CG)');

  async function insertLocation(parentId, level, name, bedStatus) {
    await conn.query(
      'INSERT INTO care_location (org_id, parent_id, level, name, bed_status) VALUES (?,?,?,?,?)',
      [orgId, parentId, level, name, bedStatus ?? null],
    );
    const [[row]] = await conn.query('SELECT id FROM care_location ORDER BY id DESC LIMIT 1');
    return row.id;
  }

  const buildingA = await insertLocation(null, 'BUILDING', 'A栋', null);
  const floorA1 = await insertLocation(buildingA, 'FLOOR', '1层', null);
  const room101 = await insertLocation(floorA1, 'ROOM', '101房', null);
  const bedA01 = await insertLocation(room101, 'BED', '01床', 'FREE');
  const bedA02 = await insertLocation(room101, 'BED', '02床', 'FREE');
  const bedA03 = await insertLocation(room101, 'BED', '03床', 'FREE');
  const buildingB = await insertLocation(null, 'BUILDING', 'B栋', null);
  const floorB1 = await insertLocation(buildingB, 'FLOOR', '1层', null);
  const room102 = await insertLocation(floorB1, 'ROOM', '102房', null);
  await insertLocation(room102, 'BED', '01床', 'FREE');
  await insertLocation(room102, 'BED', '02床', 'FREE');
  console.log('床位层级已创建: A栋-1层-101房(01/02/03床)、B栋-1层-102房(01/02床)');

  const elders = [
    { name: '李爷爷', gender: 'MALE', age: 82, bed: bedA01, careLevel: 3, mobility: 'BEDRIDDEN', notes: '全护理，夜间需重点关注' },
    { name: '王奶奶', gender: 'FEMALE', age: 78, bed: bedA02, careLevel: 2, mobility: 'LIMITED', notes: '行动受限，白天可自主翻身' },
    { name: '张爷爷', gender: 'MALE', age: 85, bed: bedA03, careLevel: 2, mobility: 'LIMITED', notes: '行动受限，注意皮肤状态' },
  ];
  const elderIds = [];
  for (const e of elders) {
    await conn.query(
      'INSERT INTO elder (org_id, name, gender, age, bed_location_id, care_level, mobility, care_notes, status) VALUES (?,?,?,?,?,?,?,?,?)',
      [orgId, e.name, e.gender, e.age, e.bed, e.careLevel, e.mobility, e.notes, 'IN_CARE'],
    );
    const [[row]] = await conn.query('SELECT id FROM elder ORDER BY id DESC LIMIT 1');
    elderIds.push(row.id);
    await conn.query('UPDATE care_location SET bed_status=?, current_elder_id=? WHERE id=?', ['OCCUPIED', row.id, e.bed]);
  }
  console.log('老人档案已创建: 李爷爷/王奶奶/张爷爷');

  const devices = [
    { no: 'SIM-DEMO-001', elderIdx: 0, elderName: '李爷爷' },
    { no: 'SIM-DEMO-002', elderIdx: 2, elderName: '张爷爷' },
  ];
  for (const d of devices) {
    const key = `dev_${createHash('md5').update(d.no + Date.now()).digest('hex').slice(0, 24)}`;
    await conn.query(
      'INSERT INTO device (org_id, device_no, device_type, source, device_key_hash, online_status, status) VALUES (?,?,?,?,?,?,?)',
      [orgId, d.no, 'DIAPER_SENSOR', 'SIMULATED', hashDeviceKey(key), 'UNKNOWN', 'ACTIVE'],
    );
    const [[devRow]] = await conn.query('SELECT id FROM device ORDER BY id DESC LIMIT 1');
    const elderId = elderIds[d.elderIdx];
    await conn.query(
      'INSERT INTO device_binding (device_id, elder_id, started_at, active_key, operator_id) VALUES (?,?,?,?,1)',
      [devRow.id, elderId, new Date(), null],
    );
    const [[bindRow]] = await conn.query('SELECT id FROM device_binding ORDER BY id DESC LIMIT 1');
    await conn.query('UPDATE device_binding SET active_key=? WHERE id=?', [bindRow.id, bindRow.id]);
    await conn.query(
      'INSERT INTO care_cycle (elder_id, device_id, started_at, status) VALUES (?,?,?,?)',
      [elderId, devRow.id, new Date(), 'ACTIVE'],
    );
    console.log(`模拟设备 ${d.no} 已绑定 ${d.elderName}（device_key: ${key}）`);
  }

  console.log('\n=== 种子数据完成 ===');
  await conn.end();
}

main().catch((err) => {
  console.error('种子数据失败:', err.message);
  process.exit(1);
});