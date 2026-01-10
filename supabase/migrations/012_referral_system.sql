-- ============================================
-- REFERRAL SYSTEM
-- ============================================
-- Enables tutorial centers to refer other centers
-- Both referrer and referred get rewards
-- ============================================

-- ============================================
-- REFERRAL STATUS ENUM
-- ============================================

CREATE TYPE referral_status AS ENUM ('pending', 'completed', 'rewarded', 'expired');

-- ============================================
-- REFERRAL CODES TABLE
-- ============================================
-- Each center gets a unique referral code

CREATE TABLE referral_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID NOT NULL REFERENCES tutorial_centers(id) ON DELETE CASCADE,
    code VARCHAR(20) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    total_referrals INTEGER DEFAULT 0,
    successful_referrals INTEGER DEFAULT 0,
    total_rewards_earned DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast code lookups
CREATE INDEX idx_referral_codes_code ON referral_codes(code);
CREATE INDEX idx_referral_codes_center ON referral_codes(center_id);

-- ============================================
-- REFERRALS TABLE
-- ============================================
-- Tracks each referral relationship

CREATE TABLE referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_code_id UUID NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,
    referrer_center_id UUID NOT NULL REFERENCES tutorial_centers(id) ON DELETE CASCADE,
    referred_center_id UUID REFERENCES tutorial_centers(id) ON DELETE SET NULL,
    referred_email VARCHAR(255), -- Store email in case center not yet created

    -- Status tracking
    status referral_status DEFAULT 'pending',

    -- Reward tracking
    referrer_reward_amount DECIMAL(10, 2) DEFAULT 100, -- R100 credit
    referred_reward_amount DECIMAL(10, 2) DEFAULT 50,  -- R50 credit (50% off first month at R99)
    referrer_reward_applied BOOLEAN DEFAULT FALSE,
    referred_reward_applied BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ, -- When referred center subscribes
    rewarded_at TIMESTAMPTZ,  -- When rewards are applied
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 days')
);

-- Indexes
CREATE INDEX idx_referrals_referrer ON referrals(referrer_center_id);
CREATE INDEX idx_referrals_referred ON referrals(referred_center_id);
CREATE INDEX idx_referrals_code ON referrals(referral_code_id);
CREATE INDEX idx_referrals_email ON referrals(referred_email);
CREATE INDEX idx_referrals_status ON referrals(status);

-- ============================================
-- REFERRAL REWARDS TABLE
-- ============================================
-- Tracks reward credits for each center

CREATE TABLE referral_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID NOT NULL REFERENCES tutorial_centers(id) ON DELETE CASCADE,
    referral_id UUID REFERENCES referrals(id) ON DELETE SET NULL,

    -- Reward details
    amount DECIMAL(10, 2) NOT NULL,
    reward_type VARCHAR(50) NOT NULL, -- 'referrer_bonus', 'referred_discount'
    description TEXT,

    -- Status
    is_applied BOOLEAN DEFAULT FALSE,
    applied_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '365 days'),

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_referral_rewards_center ON referral_rewards(center_id);
CREATE INDEX idx_referral_rewards_applied ON referral_rewards(is_applied);

-- ============================================
-- ADD REFERRAL TRACKING TO TUTORIAL_CENTERS
-- ============================================

ALTER TABLE tutorial_centers
ADD COLUMN IF NOT EXISTS referred_by_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS referral_credit_balance DECIMAL(10, 2) DEFAULT 0;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;

-- Referral codes policies
CREATE POLICY "Users can view their center's referral code"
    ON referral_codes FOR SELECT
    USING (
        center_id IN (
            SELECT center_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Super admin can view all referral codes"
    ON referral_codes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

CREATE POLICY "Anyone can look up a referral code by code"
    ON referral_codes FOR SELECT
    USING (is_active = true);

-- Referrals policies
CREATE POLICY "Users can view referrals they made"
    ON referrals FOR SELECT
    USING (
        referrer_center_id IN (
            SELECT center_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can view referrals made to them"
    ON referrals FOR SELECT
    USING (
        referred_center_id IN (
            SELECT center_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Super admin can view all referrals"
    ON referrals FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- Referral rewards policies
CREATE POLICY "Users can view their center's rewards"
    ON referral_rewards FOR SELECT
    USING (
        center_id IN (
            SELECT center_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Super admin can view all rewards"
    ON referral_rewards FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code(center_name TEXT)
RETURNS TEXT AS $$
DECLARE
    base_code TEXT;
    final_code TEXT;
    counter INTEGER := 0;
BEGIN
    -- Create base code from center name (first 4 chars uppercase) + random suffix
    base_code := UPPER(SUBSTRING(REGEXP_REPLACE(center_name, '[^a-zA-Z]', '', 'g'), 1, 4));

    -- If name is too short, pad with X
    WHILE LENGTH(base_code) < 4 LOOP
        base_code := base_code || 'X';
    END LOOP;

    -- Add random suffix
    final_code := base_code || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 4));

    -- Check for uniqueness and regenerate if needed
    WHILE EXISTS (SELECT 1 FROM referral_codes WHERE code = final_code) LOOP
        counter := counter + 1;
        final_code := base_code || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || counter::TEXT), 1, 4));
    END LOOP;

    RETURN final_code;
END;
$$ LANGUAGE plpgsql;

-- Function to create referral code for a center
CREATE OR REPLACE FUNCTION create_referral_code_for_center()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO referral_codes (center_id, code)
    VALUES (NEW.id, generate_referral_code(NEW.name));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create referral code when center is created
CREATE TRIGGER trigger_create_referral_code
    AFTER INSERT ON tutorial_centers
    FOR EACH ROW
    EXECUTE FUNCTION create_referral_code_for_center();

-- Function to complete a referral when center subscribes
CREATE OR REPLACE FUNCTION complete_referral_on_subscription()
RETURNS TRIGGER AS $$
DECLARE
    ref_record RECORD;
BEGIN
    -- Check if this center was referred and subscription just became active
    IF NEW.subscription_status = 'active' AND
       (OLD.subscription_status IS NULL OR OLD.subscription_status != 'active') AND
       NEW.referred_by_code IS NOT NULL THEN

        -- Find the pending referral
        SELECT r.*, rc.center_id as referrer_id
        INTO ref_record
        FROM referrals r
        JOIN referral_codes rc ON r.referral_code_id = rc.id
        WHERE r.referred_center_id = NEW.id
        AND r.status = 'pending';

        IF FOUND THEN
            -- Update referral status to completed
            UPDATE referrals
            SET status = 'completed',
                completed_at = NOW()
            WHERE id = ref_record.id;

            -- Update referral code stats
            UPDATE referral_codes
            SET successful_referrals = successful_referrals + 1,
                updated_at = NOW()
            WHERE id = ref_record.referral_code_id;

            -- Create reward for referrer (R100 credit)
            INSERT INTO referral_rewards (center_id, referral_id, amount, reward_type, description)
            VALUES (
                ref_record.referrer_id,
                ref_record.id,
                100,
                'referrer_bonus',
                'Referral bonus for referring ' || NEW.name
            );

            -- Add credit to referrer's balance
            UPDATE tutorial_centers
            SET referral_credit_balance = COALESCE(referral_credit_balance, 0) + 100
            WHERE id = ref_record.referrer_id;

            -- Create reward for referred center (R50 credit)
            INSERT INTO referral_rewards (center_id, referral_id, amount, reward_type, description)
            VALUES (
                NEW.id,
                ref_record.id,
                50,
                'referred_discount',
                'Welcome bonus for joining via referral'
            );

            -- Add credit to referred center's balance
            UPDATE tutorial_centers
            SET referral_credit_balance = COALESCE(referral_credit_balance, 0) + 50
            WHERE id = NEW.id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for completing referrals
CREATE TRIGGER trigger_complete_referral
    AFTER UPDATE ON tutorial_centers
    FOR EACH ROW
    EXECUTE FUNCTION complete_referral_on_subscription();

-- ============================================
-- CREATE REFERRAL CODES FOR EXISTING CENTERS
-- ============================================

INSERT INTO referral_codes (center_id, code)
SELECT id, generate_referral_code(name)
FROM tutorial_centers
WHERE id NOT IN (SELECT center_id FROM referral_codes)
ON CONFLICT DO NOTHING;
