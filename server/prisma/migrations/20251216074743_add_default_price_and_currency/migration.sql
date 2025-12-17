-- AlterTable
ALTER TABLE `ProductVariant` MODIFY `price` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    MODIFY `currency` CHAR(3) NOT NULL DEFAULT 'THB';
