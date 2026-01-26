-- CreateEnum
CREATE TYPE "DayType" AS ENUM ('NORMAL', 'SICK', 'TRIP', 'VACATION');

-- CreateEnum
CREATE TYPE "PunchKind" AS ENUM ('IN', 'OUT');

-- CreateTable
CREATE TABLE "Day" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "DayType" NOT NULL DEFAULT 'NORMAL',
    "telework" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Day_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Punch" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "kind" "PunchKind" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Punch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerOperation" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "minutesDelta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "dayId" TEXT,

    CONSTRAINT "LedgerOperation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Day_date_key" ON "Day"("date");

-- AddForeignKey
ALTER TABLE "Punch" ADD CONSTRAINT "Punch_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "Day"("id") ON DELETE CASCADE ON UPDATE CASCADE;
