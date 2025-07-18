/*
  Warnings:

  - You are about to drop the column `companyName` on the `customer` table. All the data in the column will be lost.
  - You are about to drop the column `taxNumber` on the `customer` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `customer` DROP COLUMN `companyName`,
    DROP COLUMN `taxNumber`;
