-- CreateTable
CREATE TABLE "ContactAudit" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContactAudit_workspaceId_idx" ON "ContactAudit"("workspaceId");

-- CreateIndex
CREATE INDEX "ContactAudit_contactId_idx" ON "ContactAudit"("contactId");

-- AddForeignKey
ALTER TABLE "ContactAudit" ADD CONSTRAINT "ContactAudit_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
