-- Check for deals with invalid publisher/advertiser IDs
-- Run this after the migration to ensure data integrity

SELECT
    id,
    deal_id,
    publisher_id,
    advertiser_id,
    channel_id,
    created_at
FROM deals
WHERE publisher_id = 0 OR advertiser_id = 0;

-- Count total deals
SELECT COUNT(*) as total_deals FROM deals;

-- Count deals with invalid IDs
SELECT COUNT(*) as invalid_deals FROM deals WHERE publisher_id = 0 OR advertiser_id = 0;
