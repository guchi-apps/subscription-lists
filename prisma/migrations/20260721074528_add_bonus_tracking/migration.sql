-- CreateTable
CREATE TABLE `BonusPeriod` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `startDate` DATE NOT NULL,
    `targetAmount` DECIMAL(10, 2) NOT NULL DEFAULT 1000000,
    `bonusPoints` INTEGER NOT NULL DEFAULT 10000,
    `pointEarnRate` DECIMAL(6, 4) NOT NULL DEFAULT 0.0050,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `BonusPeriod_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BonusSpendEntry` (
    `id` VARCHAR(191) NOT NULL,
    `periodId` VARCHAR(191) NOT NULL,
    `recordedAt` DATE NOT NULL,
    `cumulativeAmount` DECIMAL(10, 2) NOT NULL,
    `memo` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `BonusSpendEntry_periodId_recordedAt_idx`(`periodId`, `recordedAt`),
    UNIQUE INDEX `BonusSpendEntry_periodId_recordedAt_key`(`periodId`, `recordedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `BonusPeriod` ADD CONSTRAINT `BonusPeriod_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BonusSpendEntry` ADD CONSTRAINT `BonusSpendEntry_periodId_fkey` FOREIGN KEY (`periodId`) REFERENCES `BonusPeriod`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
