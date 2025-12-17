/*
  Warnings:

  - You are about to drop the column `currency` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `discountTotal` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `line2` on the `OrderAddress` table. All the data in the column will be lost.
  - You are about to drop the column `taxAmount` on the `OrderItem` table. All the data in the column will be lost.
  - You are about to drop the column `taxRate` on the `OrderItem` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `paidAt` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `provider` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `rawPayload` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `txnId` on the `Payment` table. All the data in the column will be lost.
  - The values [AUTHORIZED,CAPTURED,FAILED,REFUNDED] on the enum `Payment_status` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `updatedAt` to the `Payment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Order` DROP COLUMN `currency`,
    DROP COLUMN `discountTotal`;

-- AlterTable
ALTER TABLE `OrderAddress` DROP COLUMN `line2`;

-- AlterTable
ALTER TABLE `OrderItem` DROP COLUMN `taxAmount`,
    DROP COLUMN `taxRate`;

-- AlterTable
ALTER TABLE `Payment` DROP COLUMN `currency`,
    DROP COLUMN `paidAt`,
    DROP COLUMN `provider`,
    DROP COLUMN `rawPayload`,
    DROP COLUMN `txnId`,
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `payerName` VARCHAR(191) NULL,
    ADD COLUMN `slipUrl` VARCHAR(191) NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL,
    ADD COLUMN `verifiedAt` DATETIME(3) NULL,
    ADD COLUMN `verifiedBy` BIGINT NULL,
    MODIFY `status` ENUM('PENDING', 'VERIFIED', 'REJECTED') NOT NULL DEFAULT 'PENDING';
