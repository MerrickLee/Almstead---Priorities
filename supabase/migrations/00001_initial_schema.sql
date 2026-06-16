-- Create tables

CREATE TABLE branches (
  id text PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role IN ('member', 'manager', 'admin')),
  branch_id text REFERENCES branches(id),
  active boolean DEFAULT true
);

CREATE TABLE lists (
  id text PRIMARY KEY,
  branch_id text NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('branch', 'arborist')),
  arborist_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  name text NOT NULL,
  color text,
  archived boolean DEFAULT false,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id text NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  title text NOT NULL,
  notes jsonb,
  sort_order float8 NOT NULL DEFAULT 0,
  status text NOT NULL CHECK (status IN ('open', 'completed')) DEFAULT 'open',
  due_date timestamptz,
  assignee_id uuid REFERENCES users(id) ON DELETE SET NULL,
  pinned boolean DEFAULT false,
  source text NOT NULL CHECK (source IN ('manual', 'hubspot', 'acorn')) DEFAULT 'manual',
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  completed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE item_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  thumb_path text,
  uploaded_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE item_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  system text NOT NULL CHECK (system IN ('hubspot', 'acorn')),
  record_type text,
  external_id text NOT NULL,
  cached_label text,
  cached_status text,
  last_synced_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE
);

CREATE TABLE item_tags (
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, tag_id)
);

CREATE TABLE subscriptions (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  list_id text NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  include_sublists boolean NOT NULL DEFAULT true,
  frequency text NOT NULL CHECK (frequency IN ('weekly', 'daily', 'off')) DEFAULT 'weekly',
  PRIMARY KEY (user_id, list_id)
);

CREATE TABLE activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES items(id) ON DELETE CASCADE,
  list_id text REFERENCES lists(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('created', 'edited', 'completed', 'reopened', 'moved_rank', 'moved_list', 'deleted', 'linked')),
  detail jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  author_id uuid REFERENCES users(id) ON DELETE SET NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Turn on RLS
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user role
CREATE OR REPLACE FUNCTION get_user_role() RETURNS text AS $$
DECLARE
  role text;
BEGIN
  SELECT u.role INTO role FROM users u WHERE u.id = auth.uid();
  RETURN COALESCE(role, 'member'); -- default to member if not found
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Branches & Lists: Everyone can read
CREATE POLICY "Branches are readable by everyone" ON branches FOR SELECT USING (true);
CREATE POLICY "Lists are readable by everyone" ON lists FOR SELECT USING (true);
-- Write policies for lists (only admins can create)
CREATE POLICY "Admins can insert lists" ON lists FOR INSERT WITH CHECK (get_user_role() = 'admin');

-- 2. Users: Everyone can read
CREATE POLICY "Users are readable by everyone" ON users FOR SELECT USING (true);

-- 3. Items:
CREATE POLICY "Items are readable by everyone" ON items FOR SELECT USING (true);

-- Item INSERT is admin-only.
CREATE POLICY "Only admins can insert items" ON items FOR INSERT WITH CHECK (get_user_role() = 'admin');

-- Item UPDATE
-- Members: only status, notes on items where assignee_id = auth.uid() (enforced partially in DB and via trigger to block sort_order changes)
-- Managers/Admins: can update all
CREATE POLICY "Users can update items" ON items FOR UPDATE
USING (
  get_user_role() IN ('admin', 'manager') OR 
  (get_user_role() = 'member' AND assignee_id = auth.uid())
);

-- Item DELETE is admin-only
CREATE POLICY "Only admins can delete items" ON items FOR DELETE USING (get_user_role() = 'admin');

-- 4. Activity Log: insert-only for everyone (handled by triggers mostly, but manual inserts allowed if needed)
CREATE POLICY "Activity log is readable by everyone" ON activity_log FOR SELECT USING (true);
CREATE POLICY "Activity log is insertable by everyone" ON activity_log FOR INSERT WITH CHECK (true);

-- 5. Subscriptions: Users can manage their own
CREATE POLICY "Users manage own subscriptions" ON subscriptions FOR ALL USING (user_id = auth.uid());

-- Triggers

-- Trigger 1: Set sort_order on INSERT
CREATE OR REPLACE FUNCTION set_item_sort_order() RETURNS trigger AS $$
DECLARE
  max_order float8;
BEGIN
  -- Always override whatever was passed in
  SELECT MAX(sort_order) INTO max_order FROM items WHERE list_id = NEW.list_id AND status = 'open';
  NEW.sort_order := COALESCE(max_order, 0) + 1024;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_item_sort_order
BEFORE INSERT ON items
FOR EACH ROW
EXECUTE FUNCTION set_item_sort_order();

-- Trigger 2: Prevent Members from updating sort_order and pinned, and track changes to activity_log
CREATE OR REPLACE FUNCTION handle_item_update() RETURNS trigger AS $$
DECLARE
  user_role text;
  action_type text;
  detail_json jsonb;
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
    -- Note: UI will pass explicit activity logs for fine-grained old_rank/new_rank text if needed, 
    -- but we can record a basic one here.
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

CREATE TRIGGER trigger_handle_item_update
BEFORE UPDATE ON items
FOR EACH ROW
EXECUTE FUNCTION handle_item_update();

-- Trigger 3: Insert activity log on CREATE
CREATE OR REPLACE FUNCTION log_item_insert() RETURNS trigger AS $$
BEGIN
  INSERT INTO activity_log (item_id, list_id, actor_id, action, detail)
  VALUES (NEW.id, NEW.list_id, auth.uid(), 'created', NULL);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_item_insert
AFTER INSERT ON items
FOR EACH ROW
EXECUTE FUNCTION log_item_insert();

-- Images RLS
CREATE POLICY "Images readable by all" ON item_images FOR SELECT USING (true);
CREATE POLICY "Images insertable by all" ON item_images FOR INSERT WITH CHECK (true);
CREATE POLICY "Images deletable by uploader or manager" ON item_images FOR DELETE USING (uploaded_by = auth.uid() OR get_user_role() IN ('admin', 'manager'));
