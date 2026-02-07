-- AlterTable: add publisher_id, advertiser_id, channel_id to deals
ALTER TABLE "deals" ADD COLUMN "publisher_id" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "deals" ADD COLUMN "advertiser_id" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "deals" ADD COLUMN "channel_id" BIGINT;
