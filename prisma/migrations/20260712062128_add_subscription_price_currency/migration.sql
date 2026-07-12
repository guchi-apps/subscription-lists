-- AlterTable
ALTER TABLE `SubscriptionPrice` ADD COLUMN `currency` ENUM('JPY', 'USD') NOT NULL DEFAULT 'JPY';
