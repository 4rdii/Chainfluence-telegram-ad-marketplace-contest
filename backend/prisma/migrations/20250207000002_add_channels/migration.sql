-- CreateTable
CREATE TABLE "channels" (
    "id" BIGINT NOT NULL,
    "owner_id" BIGINT NOT NULL,
    "username" TEXT,
    "title" TEXT,
    "category" TEXT,
    "subscribers" INTEGER,
    "avg_views" INTEGER,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "stats_updated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channels_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "channels" ADD CONSTRAINT "channels_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
