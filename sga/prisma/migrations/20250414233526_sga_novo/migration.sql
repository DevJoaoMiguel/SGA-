/*
  Warnings:

  - You are about to drop the column `createdAt` on the `pedido` table. All the data in the column will be lost.
  - You are about to drop the column `dataEntrega` on the `pedido` table. All the data in the column will be lost.
  - You are about to drop the column `observacoes` on the `pedido` table. All the data in the column will be lost.
  - You are about to drop the column `precoTotal` on the `pedido` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `pedido` table. All the data in the column will be lost.
  - You are about to drop the `pedidoitem` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `email` to the `Pedido` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nome` to the `Pedido` table without a default value. This is not possible if the table is not empty.
  - Added the required column `produtoId` to the `Pedido` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quantidade` to the `Pedido` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rm` to the `Pedido` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tamanho` to the `Pedido` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalPrice` to the `Pedido` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `pedidoitem` DROP FOREIGN KEY `PedidoItem_pedidoId_fkey`;

-- DropForeignKey
ALTER TABLE `pedidoitem` DROP FOREIGN KEY `PedidoItem_productId_fkey`;

-- AlterTable
ALTER TABLE `pedido` DROP COLUMN `createdAt`,
    DROP COLUMN `dataEntrega`,
    DROP COLUMN `observacoes`,
    DROP COLUMN `precoTotal`,
    DROP COLUMN `updatedAt`,
    ADD COLUMN `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `email` VARCHAR(191) NOT NULL,
    ADD COLUMN `nome` VARCHAR(191) NOT NULL,
    ADD COLUMN `produtoId` INTEGER NOT NULL,
    ADD COLUMN `quantidade` INTEGER NOT NULL,
    ADD COLUMN `rm` VARCHAR(191) NOT NULL,
    ADD COLUMN `tamanho` VARCHAR(191) NOT NULL,
    ADD COLUMN `totalPrice` DOUBLE NOT NULL;

-- DropTable
DROP TABLE `pedidoitem`;

-- AddForeignKey
ALTER TABLE `Pedido` ADD CONSTRAINT `Pedido_produtoId_fkey` FOREIGN KEY (`produtoId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
