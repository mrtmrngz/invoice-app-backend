/*
  Warnings:

  - Added the required column `subTotal` to the `Items` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `items` ADD COLUMN `subTotal` DOUBLE NOT NULL;
