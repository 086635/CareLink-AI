import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1700000000000 implements MigrationInterface {
  name = 'InitSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`organization\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(128) NOT NULL,
        \`address\` VARCHAR(256) NULL,
        \`contact\` VARCHAR(64) NULL,
        \`status\` VARCHAR(16) NOT NULL DEFAULT 'ENABLED',
        \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );

    await queryRunner.query(
      `CREATE TABLE \`care_location\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`org_id\` BIGINT NOT NULL,
        \`parent_id\` BIGINT NULL,
        \`level\` VARCHAR(16) NOT NULL,
        \`name\` VARCHAR(64) NOT NULL,
        \`bed_status\` VARCHAR(16) NULL,
        \`current_elder_id\` BIGINT NULL,
        \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        UNIQUE KEY \`uk_parent_name\` (\`parent_id\`, \`name\`),
        UNIQUE KEY \`uk_current_elder\` (\`current_elder_id\`),
        KEY \`idx_org\` (\`org_id\`),
        CONSTRAINT \`fk_location_parent\` FOREIGN KEY (\`parent_id\`) REFERENCES \`care_location\`(\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );

    await queryRunner.query(
      `CREATE TABLE \`caregiver\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`org_id\` BIGINT NOT NULL,
        \`name\` VARCHAR(64) NOT NULL,
        \`phone\` VARCHAR(20) NOT NULL,
        \`account\` VARCHAR(64) NOT NULL,
        \`password_hash\` VARCHAR(100) NOT NULL,
        \`role\` VARCHAR(8) NOT NULL,
        \`on_duty\` TINYINT(1) NOT NULL DEFAULT 1,
        \`status\` VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
        \`area_location_id\` BIGINT NULL,
        \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        UNIQUE KEY \`uk_org_account\` (\`org_id\`, \`account\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );

    await queryRunner.query(
      `CREATE TABLE \`elder\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`org_id\` BIGINT NOT NULL,
        \`name\` VARCHAR(64) NOT NULL,
        \`gender\` VARCHAR(8) NOT NULL,
        \`age\` INT NOT NULL,
        \`bed_location_id\` BIGINT NULL,
        \`care_level\` TINYINT NOT NULL,
        \`mobility\` VARCHAR(16) NOT NULL,
        \`care_notes\` VARCHAR(500) NULL,
        \`status\` VARCHAR(16) NOT NULL DEFAULT 'IN_CARE',
        \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        KEY \`idx_org_status\` (\`org_id\`, \`status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );

    await queryRunner.query(
      `CREATE TABLE \`device\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`org_id\` BIGINT NOT NULL,
        \`device_no\` VARCHAR(64) NOT NULL,
        \`device_type\` VARCHAR(32) NOT NULL,
        \`source\` VARCHAR(16) NOT NULL,
        \`device_key_hash\` VARCHAR(100) NOT NULL,
        \`online_status\` VARCHAR(16) NOT NULL DEFAULT 'UNKNOWN',
        \`last_seen_at\` DATETIME(3) NULL,
        \`battery\` INT NULL,
        \`status\` VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
        \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        UNIQUE KEY \`uk_device_no\` (\`device_no\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );

    await queryRunner.query(
      `CREATE TABLE \`device_binding\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`device_id\` BIGINT NOT NULL,
        \`elder_id\` BIGINT NOT NULL,
        \`started_at\` DATETIME(3) NOT NULL,
        \`ended_at\` DATETIME(3) NULL,
        \`active_key\` BIGINT NULL,
        \`operator_id\` BIGINT NOT NULL,
        \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        UNIQUE KEY \`uk_device_active\` (\`device_id\`, \`active_key\`),
        KEY \`idx_elder\` (\`elder_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );

    await queryRunner.query(
      `CREATE TABLE \`care_cycle\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`elder_id\` BIGINT NOT NULL,
        \`device_id\` BIGINT NOT NULL,
        \`started_at\` DATETIME(3) NOT NULL,
        \`ended_at\` DATETIME(3) NULL,
        \`status\` VARCHAR(16) NOT NULL,
        \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        KEY \`idx_device_ended\` (\`device_id\`, \`ended_at\`),
        KEY \`idx_elder_status\` (\`elder_id\`, \`status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );

    await queryRunner.query(
      `CREATE TABLE \`sensor_reading\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`device_id\` BIGINT NOT NULL,
        \`collected_at\` DATETIME(3) NOT NULL,
        \`received_at\` DATETIME(3) NOT NULL,
        \`metric_type\` VARCHAR(32) NOT NULL,
        \`metric_value\` DECIMAL(10,3) NOT NULL,
        \`quality\` VARCHAR(16) NOT NULL,
        \`simulated\` TINYINT(1) NOT NULL,
        \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        KEY \`idx_device_collected\` (\`device_id\`, \`collected_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );

    await queryRunner.query(
      `CREATE TABLE \`care_event\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`org_id\` BIGINT NOT NULL,
        \`event_type\` VARCHAR(32) NOT NULL,
        \`status\` VARCHAR(32) NOT NULL,
        \`elder_id\` BIGINT NULL,
        \`device_id\` BIGINT NOT NULL,
        \`care_cycle_id\` BIGINT NULL,
        \`trigger_evidence\` JSON NOT NULL,
        \`triggered_at\` DATETIME(3) NOT NULL,
        \`last_signal_at\` DATETIME(3) NULL,
        \`signal_count\` INT NOT NULL DEFAULT 1,
        \`dedup_key\` VARCHAR(128) NULL,
        \`false_alarm_reason\` VARCHAR(500) NULL,
        \`simulated\` TINYINT(1) NOT NULL,
        \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        UNIQUE KEY \`uk_dedup_key\` (\`dedup_key\`),
        KEY \`idx_elder_status\` (\`elder_id\`, \`status\`),
        KEY \`idx_org_created\` (\`org_id\`, \`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );

    await queryRunner.query(
      `CREATE TABLE \`care_task\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`org_id\` BIGINT NOT NULL,
        \`task_type\` VARCHAR(32) NOT NULL,
        \`status\` VARCHAR(32) NOT NULL,
        \`source_event_id\` BIGINT NULL,
        \`created_by_id\` BIGINT NULL,
        \`elder_id\` BIGINT NULL,
        \`owner_id\` BIGINT NULL,
        \`area_location_id\` BIGINT NULL,
        \`priority\` TINYINT NOT NULL,
        \`deadline\` DATETIME(3) NOT NULL,
        \`timeout_flag\` TINYINT(1) NOT NULL DEFAULT 0,
        \`timeout_at\` DATETIME(3) NULL,
        \`cancel_reason\` VARCHAR(500) NULL,
        \`effective_key\` VARCHAR(128) NULL,
        \`claimed_at\` DATETIME(3) NULL,
        \`completed_at\` DATETIME(3) NULL,
        \`simulated\` TINYINT(1) NOT NULL,
        \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        UNIQUE KEY \`uk_effective_key\` (\`effective_key\`),
        KEY \`idx_owner_status\` (\`owner_id\`, \`status\`),
        KEY \`idx_org_status\` (\`org_id\`, \`status\`),
        KEY \`idx_deadline_timeout\` (\`deadline\`, \`timeout_flag\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );

    await queryRunner.query(
      `CREATE TABLE \`care_record\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`org_id\` BIGINT NOT NULL,
        \`task_id\` BIGINT NOT NULL,
        \`event_id\` BIGINT NULL,
        \`elder_id\` BIGINT NOT NULL,
        \`device_id\` BIGINT NULL,
        \`executor_id\` BIGINT NOT NULL,
        \`executed_at\` DATETIME(3) NOT NULL,
        \`check_result\` VARCHAR(32) NOT NULL,
        \`care_result\` VARCHAR(32) NULL,
        \`skin_abnormal\` TINYINT(1) NULL,
        \`note\` VARCHAR(500) NULL,
        \`simulated\` TINYINT(1) NOT NULL,
        \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        KEY \`idx_elder_executed\` (\`elder_id\`, \`executed_at\`),
        KEY \`idx_executor_executed\` (\`executor_id\`, \`executed_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );

    await queryRunner.query(
      `CREATE TABLE \`handover\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`org_id\` BIGINT NOT NULL,
        \`shift_from\` DATETIME(3) NOT NULL,
        \`shift_to\` DATETIME(3) NOT NULL,
        \`from_caregiver_id\` BIGINT NOT NULL,
        \`to_caregiver_id\` BIGINT NOT NULL,
        \`handed_over_at\` DATETIME(3) NOT NULL,
        \`ai_report_id\` BIGINT NULL,
        \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        KEY \`idx_org_handed\` (\`org_id\`, \`handed_over_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );

    await queryRunner.query(
      `CREATE TABLE \`handover_item\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`handover_id\` BIGINT NOT NULL,
        \`task_id\` BIGINT NOT NULL,
        \`owner_before\` BIGINT NULL,
        \`owner_after\` BIGINT NULL,
        \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        KEY \`idx_handover\` (\`handover_id\`),
        KEY \`idx_task\` (\`task_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );

    await queryRunner.query(
      `CREATE TABLE \`ai_report\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`org_id\` BIGINT NOT NULL,
        \`type\` VARCHAR(32) NOT NULL,
        \`elder_id\` BIGINT NULL,
        \`content\` JSON NOT NULL,
        \`data_range\` JSON NOT NULL,
        \`insufficient_flag\` TINYINT(1) NOT NULL DEFAULT 0,
        \`degraded_flag\` TINYINT(1) NOT NULL DEFAULT 0,
        \`source\` VARCHAR(8) NOT NULL DEFAULT 'AI',
        \`created_by_id\` BIGINT NULL,
        \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        KEY \`idx_org_type\` (\`org_id\`, \`type\`),
        KEY \`idx_elder\` (\`elder_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );

    await queryRunner.query(
      `CREATE TABLE \`audit_log\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`org_id\` BIGINT NOT NULL,
        \`operator_id\` BIGINT NULL,
        \`object_type\` VARCHAR(32) NOT NULL,
        \`object_id\` BIGINT NULL,
        \`action\` VARCHAR(32) NOT NULL,
        \`summary\` VARCHAR(500) NULL,
        \`ip\` VARCHAR(64) NULL,
        \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        KEY \`idx_org_created\` (\`org_id\`, \`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );

    await queryRunner.query(
      `CREATE TABLE \`notification\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`org_id\` BIGINT NOT NULL,
        \`receiver_id\` BIGINT NOT NULL,
        \`type\` VARCHAR(32) NOT NULL,
        \`title\` VARCHAR(128) NOT NULL,
        \`payload\` JSON NOT NULL,
        \`related_type\` VARCHAR(32) NOT NULL,
        \`related_id\` BIGINT NOT NULL,
        \`is_read\` TINYINT(1) NOT NULL DEFAULT 0,
        \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        KEY \`idx_receiver_read\` (\`receiver_id\`, \`is_read\`, \`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );

    await queryRunner.query(
      `CREATE TABLE \`rule_config\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`org_id\` BIGINT NULL,
        \`rule_key\` VARCHAR(64) NOT NULL,
        \`rule_value\` JSON NOT NULL,
        \`description\` VARCHAR(256) NULL,
        \`updated_by_id\` BIGINT NULL,
        \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        UNIQUE KEY \`uk_org_rule\` (\`org_id\`, \`rule_key\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );

    await queryRunner.query(
      `CREATE TABLE \`status_transition_log\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`entity_type\` VARCHAR(8) NOT NULL,
        \`entity_id\` BIGINT NOT NULL,
        \`from_status\` VARCHAR(32) NULL,
        \`to_status\` VARCHAR(32) NOT NULL,
        \`operator_id\` BIGINT NULL,
        \`reason\` VARCHAR(500) NULL,
        \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        KEY \`idx_entity\` (\`entity_type\`, \`entity_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );

    await queryRunner.query(
      `INSERT INTO \`rule_config\` (\`org_id\`, \`rule_key\`, \`rule_value\`, \`description\`) VALUES
      (NULL, 'moisture_trigger', JSON_OBJECT('threshold', 60, 'durationSeconds', 0, 'note', '演示默认值，待硬件校准（R007）'), '尿湿触发阈值'),
      (NULL, 'device_offline', JSON_OBJECT('offlineSeconds', 180), '设备离线判定时限'),
      (NULL, 'task_timeout', JSON_OBJECT('MOISTURE_CARE', 30, 'DEVICE_CHECK', 15, 'MANUAL_CHECK', 30), '任务超时时限（分钟）'),
      (NULL, 'monitor_levels', JSON_OBJECT('normalMax', 59, 'pendingMin', 60), '监测状态分级规则'),
      (NULL, 'task_sort_weights', JSON_OBJECT('careLevel', 100, 'deadline', 50, 'waitMinutes', 1), '事件/任务排序权重'),
      (NULL, 'personal_baseline', JSON_OBJECT('windowDays', 14, 'minValidDays', 7, 'sigmaMultiplier', 1.5, 'minConfirmedEvents', 10), '个人基线参数')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      'status_transition_log',
      'rule_config',
      'notification',
      'audit_log',
      'ai_report',
      'handover_item',
      'handover',
      'care_record',
      'care_task',
      'care_event',
      'sensor_reading',
      'care_cycle',
      'device_binding',
      'device',
      'elder',
      'caregiver',
      'care_location',
      'organization',
    ];
    for (const t of tables) {
      await queryRunner.query(`DROP TABLE IF EXISTS \`${t}\``);
    }
  }
}