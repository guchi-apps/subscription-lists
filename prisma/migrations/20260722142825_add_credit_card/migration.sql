-- CreateTable
CREATE TABLE `CreditCard` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `brand` ENUM('VISA', 'MASTERCARD', 'JCB', 'AMEX', 'DINERS', 'OTHER') NOT NULL,
    `usageStatus` ENUM('MAIN', 'SUB', 'HOLDING_ONLY', 'CONSIDERING_CANCELLATION', 'CANCELLED') NOT NULL DEFAULT 'MAIN',
    `pointRate` VARCHAR(191) NULL,
    `billingDay` INTEGER NULL,
    `billingAccount` VARCHAR(191) NULL,
    `annualFee` DECIMAL(10, 2) NULL,
    `creditLimit` DECIMAL(10, 2) NULL,
    `benefits` TEXT NULL,
    `memo` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CreditCard_userId_displayOrder_idx`(`userId`, `displayOrder`),
    UNIQUE INDEX `CreditCard_userId_name_key`(`userId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CreditCard` ADD CONSTRAINT `CreditCard_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
