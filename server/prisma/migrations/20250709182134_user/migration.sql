/*
  Warnings:

  - Added the required column `verificationtoken` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isverified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "verificationtoken" TEXT NOT NULL;
