-- Insert admin user
INSERT INTO User (username, password, role, name, createdAt, updatedAt)
VALUES ('admin', 'admin123', 'admin', 'Administrator', datetime('now'), datetime('now'));

-- Verify
SELECT * FROM User;
