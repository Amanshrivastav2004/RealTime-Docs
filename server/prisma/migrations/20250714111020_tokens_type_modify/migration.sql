-- AlterTable
ALTER TABLE "User" ADD COLUMN     "passwordresettoken" BOOLEAN,
ADD COLUMN     "verificationtoken" BOOLEAN;
