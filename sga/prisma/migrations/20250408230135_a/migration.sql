/*
  Warnings:

  - You are about to drop the column `totalPrice` on the `order` table. All the data in the column will be lost.
  - Added the required column `productId` to the `Payment` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `rental` DROP FOREIGN KEY `Rental_userId_fkey`;

-- AlterTable
ALTER TABLE `order` DROP COLUMN `totalPrice`;

-- AlterTable
ALTER TABLE `payment` ADD COLUMN `productId` INTEGER NOT NULL,
    ADD COLUMN `size` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Payment_productId_idx` ON `Payment`(`productId`);

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Rental` ADD CONSTRAINT `Rental_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX `Locker_salaId_idx` ON `Locker`(`salaId`);
