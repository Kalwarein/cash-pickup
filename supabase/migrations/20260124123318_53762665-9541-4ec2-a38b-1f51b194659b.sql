-- Add investment duration fields to investments table
ALTER TABLE public.investments 
ADD COLUMN maturity_days INTEGER NOT NULL DEFAULT 7,
ADD COLUMN maturity_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN is_matured BOOLEAN DEFAULT false;

-- Update existing investments with maturity date
UPDATE public.investments 
SET maturity_date = created_at + INTERVAL '7 days'
WHERE maturity_date IS NULL;

-- Insert 50+ Sierra Leone companies across mining, agriculture, technology sectors
INSERT INTO public.companies (name, ticker, sector, risk_level, current_price, price_change_percent, min_return_percent, max_return_percent, is_trending) VALUES
-- Mining Sector (Sierra Leone is rich in diamonds, gold, iron ore, bauxite)
('Sierra Diamonds Corp', 'SDC', 'Mining', 'High', 245.50, 2.85, -35, 55, true),
('Koidu Holdings Ltd', 'KHL', 'Mining', 'High', 189.00, -1.25, -40, 60, true),
('Sierra Leone Mining Co', 'SLMC', 'Mining', 'High', 312.75, 3.45, -30, 50, false),
('Marampa Iron Ore', 'MIO', 'Mining', 'Medium', 156.30, 1.90, -25, 40, false),
('Tonkolili Resources', 'TKR', 'Mining', 'Medium', 98.60, -0.75, -20, 35, false),
('Port Loko Minerals', 'PLM', 'Mining', 'Medium', 67.45, 2.15, -22, 38, false),
('Kono Diamond Fields', 'KDF', 'Mining', 'High', 278.90, 4.20, -35, 55, true),
('Sierra Bauxite Inc', 'SBI', 'Mining', 'Medium', 134.20, -0.45, -18, 32, false),
('Moyamba Gold Ltd', 'MGL', 'Mining', 'High', 198.60, 2.75, -30, 48, false),
('Kenema Precious Metals', 'KPM', 'Mining', 'High', 167.35, -2.10, -28, 45, false),

-- Agriculture Sector (key exports: cocoa, coffee, palm oil, rice)
('SL Agri Holdings', 'SLAH', 'Agriculture', 'Low', 45.80, 1.25, -12, 25, false),
('Cocoa Sierra Leone', 'CSL', 'Agriculture', 'Low', 38.50, 0.85, -10, 22, true),
('Palm Oil Plantations', 'POP', 'Agriculture', 'Low', 52.30, 1.60, -8, 20, false),
('Rice Farms SL', 'RFSL', 'Agriculture', 'Low', 28.90, 0.45, -8, 18, false),
('Coffee Exporters Ltd', 'CEL', 'Agriculture', 'Low', 41.75, -0.35, -10, 22, false),
('Bo Agricultural Corp', 'BAC', 'Agriculture', 'Low', 33.60, 1.10, -9, 20, false),
('Freetown Fresh Produce', 'FFP', 'Agriculture', 'Low', 25.40, 0.75, -7, 18, false),
('Makeni Farms Ltd', 'MFL', 'Agriculture', 'Low', 31.20, -0.25, -8, 19, false),
('Kailahun Cashews', 'KCN', 'Agriculture', 'Low', 22.80, 1.35, -6, 16, false),
('Sierra Rubber Co', 'SRC', 'Agriculture', 'Medium', 48.90, -0.85, -12, 24, false),

-- Technology Sector
('Freetown Tech Hub', 'FTH', 'Technology', 'High', 125.60, 5.25, -25, 45, true),
('Sierra Digital', 'SDIG', 'Technology', 'High', 89.30, 3.80, -22, 42, true),
('Africell Technologies', 'ACEL', 'Technology', 'Medium', 156.80, 2.45, -18, 35, true),
('Orange Digital SL', 'ODSL', 'Technology', 'Medium', 134.50, 1.95, -15, 32, false),
('SL FinTech Solutions', 'SLFS', 'Technology', 'High', 78.40, 4.10, -28, 48, false),
('PaySalone', 'PSLM', 'Technology', 'High', 95.20, -1.65, -25, 40, false),
('Mobile Money SL', 'MMSL', 'Technology', 'Medium', 112.30, 2.80, -18, 36, false),
('TechStart Freetown', 'TSF', 'Technology', 'High', 68.90, 6.15, -30, 55, false),
('SL CloudServices', 'SLCS', 'Technology', 'Medium', 142.60, 1.40, -16, 30, false),
('DataHub Africa', 'DHA', 'Technology', 'High', 185.40, -2.30, -22, 38, false),

-- Banking & Finance
('Sierra Leone Bank', 'SLB', 'Finance', 'Low', 85.20, 0.95, -12, 22, false),
('Rokel Commercial Bank', 'RCB', 'Finance', 'Low', 72.40, 0.65, -10, 20, false),
('Union Trust Bank SL', 'UTBSL', 'Finance', 'Low', 58.90, 1.25, -8, 18, false),
('Access Bank SL', 'ABSL', 'Finance', 'Medium', 94.30, -0.45, -14, 26, false),
('GT Bank Sierra Leone', 'GTSL', 'Finance', 'Medium', 108.60, 1.85, -15, 28, false),
('First Investment SL', 'FISL', 'Finance', 'Medium', 67.80, 2.10, -16, 30, false),

-- Energy & Utilities
('EDSA Power Corp', 'EDSA', 'Energy', 'Medium', 78.50, -0.95, -18, 30, false),
('SL Hydro Electric', 'SLHE', 'Energy', 'Medium', 145.30, 1.75, -15, 28, false),
('Solar Energy SL', 'SESL', 'Energy', 'High', 56.20, 3.45, -22, 40, true),
('Bumbuna Hydro Ltd', 'BHL', 'Energy', 'Medium', 112.80, 0.85, -14, 25, false),
('Green Power Africa', 'GPA', 'Energy', 'High', 89.60, 4.20, -25, 45, false),

-- Real Estate & Construction
('Freetown Properties', 'FTP', 'Real Estate', 'Medium', 198.40, 1.15, -12, 22, false),
('Hill Station Estates', 'HSE', 'Real Estate', 'Low', 245.80, 0.65, -8, 18, false),
('Aberdeen Developments', 'ABD', 'Real Estate', 'Medium', 167.30, -0.35, -10, 20, false),
('SL Construction Co', 'SLCC', 'Construction', 'Medium', 134.50, 2.25, -16, 28, false),
('Build Sierra Leone', 'BSL', 'Construction', 'Medium', 98.70, 1.45, -14, 26, false),

-- Telecommunications
('Qcell Sierra Leone', 'QSL', 'Telecom', 'Medium', 156.40, 1.85, -14, 28, true),
('Sierratel', 'STEL', 'Telecom', 'Low', 89.20, 0.55, -10, 20, false),

-- Tourism & Hospitality
('Lumley Beach Resorts', 'LBR', 'Tourism', 'Medium', 78.90, 2.45, -18, 32, false),
('Sierra Hotels Ltd', 'SHL', 'Tourism', 'Medium', 65.40, -0.75, -15, 28, false),
('Tokeh Beach Resort', 'TBR', 'Tourism', 'Medium', 54.30, 1.95, -16, 30, false),

-- Transportation
('Sierra Air', 'SAIR', 'Transport', 'High', 145.60, -1.85, -25, 40, false),
('Port of Freetown Co', 'PFC', 'Transport', 'Medium', 178.90, 1.25, -12, 24, false),
('SL Transport Corp', 'SLTC', 'Transport', 'Medium', 67.30, 0.85, -14, 26, false);

-- Update some existing companies to be Sierra Leone focused if any exist
UPDATE public.companies SET is_trending = true WHERE ticker IN ('SDC', 'KDF', 'FTH', 'ACEL');