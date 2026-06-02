CREATE TABLE water_bodies (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL, -- название водоема
    water_body_type TEXT NOT NULL CHECK (
        water_body_type IN ('река', 'озеро', 'резервуар', 'канал')
    ), -- тип водоема
    basin TEXT, -- бассейн
    created_at TIMESTAMPTZ NOT NULL DEFAULT now() 
);

CREATE TABLE settlements (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL, -- название населенного пункта
    region TEXT, -- регион, область, республика
    district TEXT, -- округ, улуус
    created_at TIMESTAMPTZ NOT NULL DEFAULT now() 
);

CREATE TABLE monitoring_stations (
    id BIGSERIAL PRIMARY KEY,
    water_body_id BIGINT NOT NULL REFERENCES water_bodies(id),
    settlement_id BIGINT REFERENCES settlements(id),
    name TEXT NOT NULL, --
    station_code TEXT UNIQUE, -- уникальный код станции
    danger_level_cm DOUBLE PRECISION, -- опасный уровень воды
    critical_level_cm DOUBLE PRECISION, -- критический уровень воды
    is_active BOOLEAN NOT NULL DEFAULT true, 
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sensors (
    sensor_id TEXT PRIMARY KEY, -- айди сенсора
    monitoring_station_id BIGINT NOT NULL REFERENCES monitoring_stations(id), -- в какую станцию входит
    name TEXT,
    sensor_type TEXT NOT NULL DEFAULT 'ultrasonic', -- тип сенсора, дефолт ультразвуковой
    is_active BOOLEAN NOT NULL DEFAULT true, -- активность
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE water_level_measurements (
    id BIGSERIAL PRIMARY KEY,
    sensor_id TEXT NOT NULL REFERENCES sensors(sensor_id), -- какой сенсор измерял
    distance_cm DOUBLE PRECISION, -- сухое измерения
    water_level_cm DOUBLE PRECISION NOT NULL, -- измерения уровня воды из сухого замера
    measured_at TIMESTAMPTZ NOT NULL DEFAULT now(), -- время замера
    received_at TIMESTAMPTZ NOT NULL DEFAULT now() -- время получения запроса на сервер
);