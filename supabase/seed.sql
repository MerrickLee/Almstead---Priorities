-- Insert Branches
INSERT INTO branches (id, name, sort_order) VALUES
('nr', 'New Rochelle', 1024),
('ha', 'Hawthorne', 2048),
('st', 'Stamford', 3072),
('nh', 'North Haledon', 4096)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;

-- Auth users are created by the local start script (admin@almstead.com), not by this seed.
-- Password hashing makes a direct auth.users insert unreliable.

-- Insert Lists (2 sample arborist lists under New Rochelle)
INSERT INTO lists (id, branch_id, type, name, sort_order) VALUES
('nr-jr', 'nr', 'arborist', 'J. Rivera', 1024),
('nr-mo', 'nr', 'arborist', 'M. Okafor', 2048)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;

-- Insert some sample items (ignoring users/assignees for simplicity in the seed)
INSERT INTO items (id, list_id, title, notes, sort_order, status) VALUES
(gen_random_uuid(), 'nr-jr', 'New Rock Prop', '{"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Final pricing review with Ken before Friday send."}]}]}', 1024, 'open'),
(gen_random_uuid(), 'nr-jr', 'Scarsdale – TP', '{"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Tree preservation plan, awaiting site photos."}]}]}', 2048, 'open'),
(gen_random_uuid(), 'nr-mo', 'Spring PHC route confirmations', null, 1024, 'completed'),
(gen_random_uuid(), 'nr-mo', 'Pelham corridor storm assessment', '{"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Photos + risk notes for 6 properties."}]}]}', 2048, 'open')
ON CONFLICT DO NOTHING;
