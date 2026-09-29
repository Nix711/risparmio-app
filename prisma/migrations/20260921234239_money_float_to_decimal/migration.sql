-- Converte tutti gli importi da double precision a numeric(12,2).
-- Non serve una clausola USING: Postgres ha un cast di assegnazione
-- float8 -> numeric. Un audit preventivo sui dati di produzione ha
-- verificato che nessuna riga cambia valore con l'arrotondamento.

-- AlterTable
ALTER TABLE "Budget" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "Expense" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "Goal" ALTER COLUMN "targetAmount" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "currentAmount" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "GoalContribution" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "SavingGoal" ALTER COLUMN "saved" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "target" SET DATA TYPE DECIMAL(12,2);

