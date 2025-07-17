/*
  Warnings:

  - Added the required column `subTotal` to the `Invoice` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `invoice` ADD COLUMN `subTotal` DOUBLE NOT NULL;
