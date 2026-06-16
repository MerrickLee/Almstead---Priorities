-- Insert Branches
INSERT INTO branches (id, name) VALUES
('nr', 'New Rochelle'),
('ha', 'Hawthorne'),
('st', 'Stamford'),
('nh', 'North Haledon')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Note: Seeding auth.users directly is complex because of password hashing, but for local testing, 
-- you can create a user through the local studio and then update their role.
-- Assuming an admin user is created via the Supabase Dashboard, you would manually update their role:
-- UPDATE public.users SET role = 'admin' WHERE email = 'admin@almstead.com';

-- Insert Lists (2 sample arborist lists under New Rochelle)
INSERT INTO lists (id, branch_id, type, name) VALUES
('nr-jr', 'nr', 'arborist', 'J. Rivera'),
('nr-mo', 'nr', 'arborist', 'M. Okafor')
ON CONFLICT (id) DO NOTHING;

-- Insert some sample items (ignoring users/assignees for simplicity in the seed)
INSERT INTO items (id, list_id, title, notes, sort_order, status) VALUES
(gen_random_uuid(), 'nr-jr', 'New Rock Prop', '{"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Final pricing review with Ken before Friday send."}]}]}', 1024, 'open'),
(gen_random_uuid(), 'nr-jr', 'Scarsdale – TP', '{"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Tree preservation plan, awaiting site photos."}]}]}', 2048, 'open'),
(gen_random_uuid(), 'nr-mo', 'Spring PHC route confirmations', null, 1024, 'completed'),
(gen_random_uuid(), 'nr-mo', 'Pelham corridor storm assessment', '{"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Photos + risk notes for 6 properties."}]}]}', 2048, 'open')
ON CONFLICT DO NOTHING;
