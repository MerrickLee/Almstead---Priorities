-- Allow all users with roles to insert items
DROP POLICY IF EXISTS "Only admins can insert items" ON items;
CREATE POLICY "Anyone can insert items" ON items FOR INSERT WITH CHECK (
  get_user_role() IN ('admin', 'manager', 'member')
);

-- Set default created_by to the auth user's ID
ALTER TABLE items ALTER COLUMN created_by SET DEFAULT auth.uid();

-- Allow members to update items if they are the creator or assignee
DROP POLICY IF EXISTS "Users can update items" ON items;
CREATE POLICY "Users can update items" ON items FOR UPDATE
USING (
  get_user_role() IN ('admin', 'manager') OR 
  (get_user_role() = 'member' AND (assignee_id = auth.uid() OR created_by = auth.uid()))
);

-- Update handle_item_update trigger to ensure members cannot change the created_by field
CREATE OR REPLACE FUNCTION handle_item_update() RETURNS trigger AS $$
DECLARE
  user_role text;
BEGIN
  NEW.updated_at = now();
  user_role := get_user_role();

  IF user_role = 'member' THEN
    IF NEW.sort_order IS DISTINCT FROM OLD.sort_order THEN
      RAISE EXCEPTION 'Members cannot change sort_order';
    END IF;
    IF NEW.list_id IS DISTINCT FROM OLD.list_id THEN
      RAISE EXCEPTION 'Members cannot change list_id';
    END IF;
    IF NEW.pinned IS DISTINCT FROM OLD.pinned THEN
      RAISE EXCEPTION 'Members cannot pin/unpin items';
    END IF;
    IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
      RAISE EXCEPTION 'Members cannot change created_by';
    END IF;
  END IF;

  -- Detect completion
  IF NEW.status = 'completed' AND OLD.status = 'open' THEN
    NEW.completed_at = now();
    NEW.completed_by = auth.uid();
    INSERT INTO activity_log (item_id, list_id, actor_id, action, detail)
    VALUES (NEW.id, NEW.list_id, auth.uid(), 'completed', NULL);
  END IF;

  -- Detect reopen
  IF NEW.status = 'open' AND OLD.status = 'completed' THEN
    NEW.completed_at = NULL;
    NEW.completed_by = NULL;
    INSERT INTO activity_log (item_id, list_id, actor_id, action, detail)
    VALUES (NEW.id, NEW.list_id, auth.uid(), 'reopened', NULL);
  END IF;

  -- Detect moved rank
  IF NEW.sort_order IS DISTINCT FROM OLD.sort_order AND NEW.list_id = OLD.list_id THEN
    INSERT INTO activity_log (item_id, list_id, actor_id, action, detail)
    VALUES (NEW.id, NEW.list_id, auth.uid(), 'moved_rank', json_build_object('old_sort_order', OLD.sort_order, 'new_sort_order', NEW.sort_order));
  END IF;

  -- Detect moved list
  IF NEW.list_id IS DISTINCT FROM OLD.list_id THEN
    INSERT INTO activity_log (item_id, list_id, actor_id, action, detail)
    VALUES (NEW.id, NEW.list_id, auth.uid(), 'moved_list', json_build_object('old_list', OLD.list_id, 'new_list', NEW.list_id));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
