-- CreateTable
CREATE TABLE "deals" (
    "id" SERIAL NOT NULL,
    "deal_id" INTEGER NOT NULL,
    "verification_chat_id" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "released_at" TIMESTAMP(3),
    "refunded_at" TIMESTAMP(3),
    "tx_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "deals_deal_id_key" ON "deals"("deal_id");
