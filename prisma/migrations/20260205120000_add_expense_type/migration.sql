-- AlterTable
ALTER TABLE "Expense" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'expense';

-- CreateIndex
CREATE INDEX "Expense_userId_type_idx" ON "Expense"("userId", "type");
