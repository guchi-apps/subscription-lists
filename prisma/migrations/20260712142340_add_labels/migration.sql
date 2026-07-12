-- CreateTable
CREATE TABLE `Label` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `color` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Label_userId_idx`(`userId`),
    UNIQUE INDEX `Label_userId_name_key`(`userId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_LabelToSubscription` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_LabelToSubscription_AB_unique`(`A`, `B`),
    INDEX `_LabelToSubscription_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Label` ADD CONSTRAINT `Label_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_LabelToSubscription` ADD CONSTRAINT `_LabelToSubscription_A_fkey` FOREIGN KEY (`A`) REFERENCES `Label`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_LabelToSubscription` ADD CONSTRAINT `_LabelToSubscription_B_fkey` FOREIGN KEY (`B`) REFERENCES `Subscription`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
