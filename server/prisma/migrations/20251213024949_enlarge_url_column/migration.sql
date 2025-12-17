-- DropForeignKey
ALTER TABLE `orders` DROP FOREIGN KEY `orders_userId_fkey`;

-- AlterTable
ALTER TABLE `Product` MODIFY `longDesc` LONGTEXT NULL;

-- AlterTable
ALTER TABLE `ProductMedia` MODIFY `url` VARCHAR(1000) NOT NULL;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `Order_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `orders` RENAME INDEX `orders_orderNumber_key` TO `Order_orderNumber_key`;

-- RenameIndex
ALTER TABLE `orders` RENAME INDEX `orders_userId_placedAt_idx` TO `Order_userId_placedAt_idx`;
