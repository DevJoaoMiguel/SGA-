-- DropForeignKey
ALTER TABLE `pagamento` DROP FOREIGN KEY `Pagamento_productId_fkey`;

-- AlterTable
ALTER TABLE `pagamento` MODIFY `productId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `Pagamento` ADD CONSTRAINT `Pagamento_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
