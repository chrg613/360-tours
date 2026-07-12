-- Enable necessary PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- 1. Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supabase_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    phone VARCHAR(20) UNIQUE NOT NULL,
    phone_verified BOOLEAN DEFAULT false,
    email VARCHAR(255) UNIQUE,
    email_verified BOOLEAN DEFAULT false,
    full_name VARCHAR(200),
    date_of_birth DATE,
    profile_image_url VARCHAR(512),
    storage_usage BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_supabase_id ON users(supabase_user_id);

-- 2. Tours Table
CREATE TABLE tours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    visibility VARCHAR(20) DEFAULT 'private' CHECK (visibility IN ('private', 'unlisted', 'public')),
    is_featured BOOLEAN DEFAULT false,
    view_count BIGINT DEFAULT 0,
    like_count BIGINT DEFAULT 0,
    share_count BIGINT DEFAULT 0,
    settings JSONB DEFAULT '{}',
    published_at TIMESTAMP WITH TIME ZONE,
    archived_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_tours_user_id ON tours(user_id);
CREATE INDEX idx_tours_status ON tours(status);

-- 3. Scenes Table
CREATE TABLE scenes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
    title VARCHAR(255),
    description TEXT,
    image_url VARCHAR(512) NOT NULL,
    thumbnail_url VARCHAR(512),
    vr_url VARCHAR(512),
    order_index INTEGER NOT NULL DEFAULT 0 CHECK (order_index >= 0),
    metadata JSONB DEFAULT '{}',
    is_processed BOOLEAN DEFAULT false,
    processing_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_scenes_tour_id ON scenes(tour_id);

-- 4. Hotspots Table
CREATE TABLE hotspots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scene_id UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('navigation', 'info', 'audio', 'video', 'link', 'custom')),
    position JSONB NOT NULL,
    target_scene_id UUID REFERENCES scenes(id),
    title VARCHAR(255),
    description TEXT,
    icon_name VARCHAR(50),
    icon_color VARCHAR(7),
    icon_size INTEGER DEFAULT 32 CHECK (icon_size > 0 AND icon_size <= 100),
    content JSONB DEFAULT '{}',
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_hotspots_scene_id ON hotspots(scene_id);

-- 5. Media Files Table
CREATE TABLE media_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255),
    file_url VARCHAR(512) NOT NULL,
    thumbnail_url VARCHAR(512),
    cdn_url VARCHAR(512),
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    width INTEGER,
    height INTEGER,
    duration INTEGER,
    folder VARCHAR(255),
    visibility VARCHAR(20) DEFAULT 'private' CHECK (visibility IN ('public', 'private', 'unlisted')),
    is_processed BOOLEAN DEFAULT false,
    processing_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- 6. Floor Plans Table
CREATE TABLE floor_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    image_url VARCHAR(512) NOT NULL,
    floor_number INTEGER DEFAULT 0,
    markers JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Analytics Events Table
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    session_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB DEFAULT '{}',
    user_agent VARCHAR(1000),
    ip_address INET,
    country_code VARCHAR(2),
    city VARCHAR(100),
    device_type VARCHAR(50),
    browser VARCHAR(50),
    os VARCHAR(50),
    screen_resolution VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Locations Table (Geospatial)
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
    name VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    coordinates GEOGRAPHY(POINT, 4326),
    timezone VARCHAR(50),
    elevation DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_locations_coordinates ON locations USING GIST(coordinates);

-- Setup RLS (Row Level Security) basics to allow public read on published tours
ALTER TABLE tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotspots ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read public tours
CREATE POLICY "Public tours are viewable by everyone" ON tours FOR SELECT USING (visibility = 'public');
-- Allow anyone to read scenes for public tours
CREATE POLICY "Scenes for public tours are viewable" ON scenes FOR SELECT USING (
    tour_id IN (SELECT id FROM tours WHERE visibility = 'public')
);
-- Allow anyone to read hotspots for public tours
CREATE POLICY "Hotspots for public tours are viewable" ON hotspots FOR SELECT USING (
    scene_id IN (SELECT id FROM scenes WHERE tour_id IN (SELECT id FROM tours WHERE visibility = 'public'))
);

-- Users can read their own tours
CREATE POLICY "Users can read own tours" ON tours FOR SELECT USING (
    auth.uid() = (SELECT supabase_user_id FROM users WHERE users.id = tours.user_id)
);
