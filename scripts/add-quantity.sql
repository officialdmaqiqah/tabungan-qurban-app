-- 1. Drop the unique constraint so users can have multiple of the same package (if needed), OR
-- actually, we can keep the unique constraint if we just use the `quantity` column.
-- Yes! Keeping the unique constraint `(user_id, package_id)` is BETTER if we use a `quantity` column!
-- This way, if they select "Kambing", it just UPSERTS or we insert `quantity = 2`.
-- Since they use a form with `quantity` now, we just insert the chosen quantity. The unique constraint prevents duplicate rows for the same package and forces them to just update the quantity (or delete and re-insert).

ALTER TABLE user_packages ADD COLUMN quantity integer NOT NULL DEFAULT 1;

-- Update existing schema.sql to reflect this change
