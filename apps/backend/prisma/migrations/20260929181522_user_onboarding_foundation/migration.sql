CREATE TYPE "OtpPurpose" AS ENUM ('REGISTRATION', 'PASSWORD_RESET');

CREATE TABLE "constituencies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(120) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "constituencies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "constituencies_name_key" ON "constituencies"("name");

INSERT INTO "constituencies" ("name", "updated_at")
VALUES
    ('Karimnagar', CURRENT_TIMESTAMP),
    ('Warangal', CURRENT_TIMESTAMP),
    ('Bhupalpally', CURRENT_TIMESTAMP),
    ('Husnabad', CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;

ALTER TABLE "users"
    ADD COLUMN "mobile_number" VARCHAR(20),
    ADD COLUMN "email_verified_at" TIMESTAMPTZ(6),
    ADD COLUMN "constituency_id" UUID;

UPDATE "users"
SET "email_verified_at" = "created_at"
WHERE "email_verified_at" IS NULL;

CREATE UNIQUE INDEX "users_mobile_number_key" ON "users"("mobile_number");
CREATE INDEX "users_constituency_id_idx" ON "users"("constituency_id");

CREATE TABLE "otps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "code_hash" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "verified_at" TIMESTAMPTZ(6),
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otps_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "otps_user_id_purpose_created_at_idx"
    ON "otps"("user_id", "purpose", "created_at");
CREATE INDEX "otps_expires_at_idx" ON "otps"("expires_at");

ALTER TABLE "users"
    ADD CONSTRAINT "users_constituency_id_fkey"
    FOREIGN KEY ("constituency_id") REFERENCES "constituencies"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "otps"
    ADD CONSTRAINT "otps_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
