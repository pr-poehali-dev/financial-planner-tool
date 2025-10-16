-- Create organizations table for premium users
CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('ИП', 'ООО', 'АО')),
    tax_system VARCHAR(10) CHECK (tax_system IN ('ОСНО', 'УСН', 'ЕСХН', 'ПСН', 'НПД', 'АУСН') OR tax_system IS NULL),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster user lookup
CREATE INDEX IF NOT EXISTS idx_organizations_user_id ON organizations(user_id);