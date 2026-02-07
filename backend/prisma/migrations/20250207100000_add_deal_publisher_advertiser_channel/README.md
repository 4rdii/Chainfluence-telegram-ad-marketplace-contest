# Migration: Add Deal Publisher, Advertiser, and Channel

## Overview
This migration adds `publisher_id`, `advertiser_id`, and `channel_id` columns to the `deals` table.

## Migration Notes

### Default Values
- `publisher_id` and `advertiser_id` use `DEFAULT 0` to allow the migration to complete
- These default values (`0`) are **not valid Telegram user IDs**
- In production, ensure no deals exist before running this migration, or manually update any existing deals

### Post-Migration Check
If you have existing deals before this migration, run this query to identify records that need manual updates:

```sql
SELECT id, deal_id, publisher_id, advertiser_id
FROM deals
WHERE publisher_id = 0 OR advertiser_id = 0;
```

If any records are found, you'll need to:
1. Retrieve the correct publisher/advertiser IDs from your on-chain Deal Registry contract
2. Update the records manually:

```sql
UPDATE deals
SET publisher_id = <correct_publisher_id>,
    advertiser_id = <correct_advertiser_id>
WHERE deal_id = <deal_id>;
```

### For New Installations
If this is a fresh installation with no existing deals, no action is required. All future deals will have valid publisher/advertiser IDs from the `register` endpoint.

## Applied
This migration was applied on: 2025-02-07

## Status
✅ Safe for new installations
⚠️ Requires manual intervention if pre-existing deals exist
