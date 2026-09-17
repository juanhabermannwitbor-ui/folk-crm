-- Split Contact.fullName into firstName/lastName. Existing rows only have
-- one string today, so there's no reliable way to know where a name splits
-- (compound surnames, single names, etc.) — rather than guess wrong, the
-- whole existing value goes into firstName and lastName stays empty; the
-- user fixes individual contacts by hand as needed, at their own pace.
ALTER TABLE "Contact" ADD COLUMN "firstName" TEXT;
ALTER TABLE "Contact" ADD COLUMN "lastName" TEXT;

UPDATE "Contact" SET "firstName" = "fullName" WHERE "firstName" IS NULL;

ALTER TABLE "Contact" ALTER COLUMN "firstName" SET NOT NULL;
