/*
  Warnings:

  - Added the required column `updatedAt` to the `Profile` table without a default value. This is not possible if the table is not empty.
  - Made the column `username` on table `Profile` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX `Profile_username_key` ON `Profile`;

-- AlterTable
ALTER TABLE `Profile` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL,
    MODIFY `username` VARCHAR(191) NOT NULL;
