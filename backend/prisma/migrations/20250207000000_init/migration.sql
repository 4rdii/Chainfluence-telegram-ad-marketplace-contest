-- CreateTable
CREATE TABLE "users" (
    "id" BIGINT NOT NULL,
    "username" TEXT,
    "wallet_address" TEXT,
    "is_publisher" BOOLEAN NOT NULL DEFAULT false,
    "is_advertiser" BOOLEAN NOT NULL DEFAULT true,
    "member_since" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
