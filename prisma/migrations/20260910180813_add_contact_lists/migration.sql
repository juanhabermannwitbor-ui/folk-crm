-- CreateTable
CREATE TABLE "ContactList" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactListMember" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactListMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContactList_workspaceId_idx" ON "ContactList"("workspaceId");

-- CreateIndex
CREATE INDEX "ContactListMember_listId_idx" ON "ContactListMember"("listId");

-- CreateIndex
CREATE INDEX "ContactListMember_contactId_idx" ON "ContactListMember"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "ContactListMember_listId_contactId_key" ON "ContactListMember"("listId", "contactId");

-- AddForeignKey
ALTER TABLE "ContactList" ADD CONSTRAINT "ContactList_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactListMember" ADD CONSTRAINT "ContactListMember_listId_fkey" FOREIGN KEY ("listId") REFERENCES "ContactList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactListMember" ADD CONSTRAINT "ContactListMember_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
