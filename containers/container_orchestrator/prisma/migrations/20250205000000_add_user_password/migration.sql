-- Add password field to User table
ALTER TABLE "User" ADD COLUMN "password" TEXT NOT NULL DEFAULT '';
