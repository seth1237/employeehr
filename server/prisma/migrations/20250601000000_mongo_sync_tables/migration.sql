-- MongoDB → MySQL sync cache tables (separate from legacy Company/User ERP tables)

CREATE TABLE IF NOT EXISTS `mongo_sync_users` (
    `id` VARCHAR(191) NOT NULL,
    `mongo_id` VARCHAR(191) NOT NULL,
    `org_id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `employee_id` VARCHAR(191) NULL,
    `password` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `department` VARCHAR(191) NULL,
    `manager_id` VARCHAR(191) NULL,
    `profileImage` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    UNIQUE INDEX `mongo_sync_users_mongo_id_key`(`mongo_id`),
    UNIQUE INDEX `mongo_sync_users_email_key`(`email`),
    UNIQUE INDEX `mongo_sync_users_employee_id_key`(`employee_id`),
    INDEX `mongo_sync_users_org_id_idx`(`org_id`),
    INDEX `mongo_sync_users_email_idx`(`email`),
    INDEX `mongo_sync_users_role_idx`(`role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `mongo_sync_companies` (
    `id` VARCHAR(191) NOT NULL,
    `mongo_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `industry` VARCHAR(191) NULL,
    `employeeCount` INTEGER NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `isFrozen` BOOLEAN NOT NULL DEFAULT false,
    `primaryColor` VARCHAR(191) NOT NULL DEFAULT '#667eea',
    `secondaryColor` VARCHAR(191) NOT NULL DEFAULT '#764ba2',
    `logo` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `mongo_sync_companies_mongo_id_key`(`mongo_id`),
    UNIQUE INDEX `mongo_sync_companies_slug_key`(`slug`),
    INDEX `mongo_sync_companies_slug_idx`(`slug`),
    INDEX `mongo_sync_companies_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `mongo_sync_audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `org_id` VARCHAR(191) NOT NULL,
    `entity_type` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `changes` JSON NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `mongo_sync_audit_logs_userId_idx`(`userId`),
    INDEX `mongo_sync_audit_logs_org_id_idx`(`org_id`),
    INDEX `mongo_sync_audit_logs_entity_type_idx`(`entity_type`),
    INDEX `mongo_sync_audit_logs_action_idx`(`action`),
    INDEX `mongo_sync_audit_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `mongo_sync_sessions` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `org_id` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `mongo_sync_sessions_token_key`(`token`),
    INDEX `mongo_sync_sessions_userId_idx`(`userId`),
    INDEX `mongo_sync_sessions_token_idx`(`token`),
    INDEX `mongo_sync_sessions_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `mongo_sync_analytics_snapshots` (
    `id` VARCHAR(191) NOT NULL,
    `org_id` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `totalUsers` INTEGER NOT NULL DEFAULT 0,
    `activeUsers` INTEGER NOT NULL DEFAULT 0,
    `totalCompanies` INTEGER NOT NULL DEFAULT 0,
    `totalProducts` INTEGER NOT NULL DEFAULT 0,
    `totalSales` INTEGER NOT NULL DEFAULT 0,
    `totalRevenue` DOUBLE NOT NULL DEFAULT 0,
    `data` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `mongo_sync_analytics_snapshots_org_id_date_key`(`org_id`, `date`),
    INDEX `mongo_sync_analytics_snapshots_org_id_idx`(`org_id`),
    INDEX `mongo_sync_analytics_snapshots_date_idx`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
