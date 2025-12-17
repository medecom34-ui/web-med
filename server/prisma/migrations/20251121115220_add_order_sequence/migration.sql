/*
  Warnings:

  - The primary key for the `OrderSequence` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `day` on the `OrderSequence` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(10)`.

*/
-- AlterTable
ALTER TABLE `OrderSequence` DROP PRIMARY KEY,
    MODIFY `day` VARCHAR(10) NOT NULL,
    ADD PRIMARY KEY (`day`);
