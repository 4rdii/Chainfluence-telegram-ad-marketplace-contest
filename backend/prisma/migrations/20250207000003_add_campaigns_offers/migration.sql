-- CreateTable
CREATE TABLE "campaigns" (
    "id" SERIAL NOT NULL,
    "advertiser_id" BIGINT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "budget" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" SERIAL NOT NULL,
    "campaign_id" INTEGER NOT NULL,
    "publisher_id" BIGINT NOT NULL,
    "channel_id" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "amount" TEXT,
    "format" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
