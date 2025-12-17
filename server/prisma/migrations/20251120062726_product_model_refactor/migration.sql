/*
  Warnings:

  - You are about to drop the `Inventory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductCategory` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `Inventory` DROP FOREIGN KEY `Inventory_variantId_fkey`;

-- DropForeignKey
ALTER TABLE `ProductCategory` DROP FOREIGN KEY `ProductCategory_categoryId_fkey`;

-- DropForeignKey
ALTER TABLE `ProductCategory` DROP FOREIGN KEY `ProductCategory_productId_fkey`;

-- AlterTable
ALTER TABLE `Product` ADD COLUMN `categoryId` BIGINT NULL;

-- AlterTable
ALTER TABLE `ProductVariant` ADD COLUMN `onHand` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `reserved` INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE `Inventory`;

-- DropTable
DROP TABLE `ProductCategory`;

-- CreateIndex
CREATE INDEX `Product_categoryId_idx` ON `Product`(`categoryId`);

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
