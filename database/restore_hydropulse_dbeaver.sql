-- DBeaver-friendly restore generated from FOR_WIN7_REAL.sql
-- Run this on the Amvera hydropulse database.

DROP TABLE IF EXISTS public.alerts CASCADE;
DROP TABLE IF EXISTS public.water_level_measurements CASCADE;
DROP TABLE IF EXISTS public.sensors CASCADE;
DROP TABLE IF EXISTS public.monitoring_stations CASCADE;
DROP TABLE IF EXISTS public.settlements CASCADE;
DROP TABLE IF EXISTS public.water_bodies CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP SEQUENCE IF EXISTS public.alerts_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.monitoring_stations_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.settlements_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.users_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.water_bodies_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.water_level_measurements_id_seq CASCADE;


--
-- PostgreSQL database dump
--

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alerts (
    id bigint NOT NULL,
    monitoring_station_id bigint NOT NULL,
    measurement_id bigint,
    alert_type text NOT NULL,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone,
    CONSTRAINT alerts_alert_type_check CHECK ((alert_type = ANY (ARRAY['danger'::text, 'critical'::text])))
);


--
-- Name: alerts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.alerts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: alerts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.alerts_id_seq OWNED BY public.alerts.id;


--
-- Name: monitoring_stations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.monitoring_stations (
    id bigint NOT NULL,
    water_body_id bigint NOT NULL,
    settlement_id bigint,
    name text NOT NULL,
    station_code text,
    danger_level_cm double precision,
    critical_level_cm double precision,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    latitude double precision,
    longitude double precision,
    sensor_height_cm double precision DEFAULT 500 NOT NULL,
    sensor_angle_deg double precision DEFAULT 0 NOT NULL
);


--
-- Name: monitoring_stations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.monitoring_stations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: monitoring_stations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.monitoring_stations_id_seq OWNED BY public.monitoring_stations.id;


--
-- Name: sensors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sensors (
    sensor_id text NOT NULL,
    monitoring_station_id bigint NOT NULL,
    name text,
    sensor_type text DEFAULT 'ultrasonic'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: settlements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settlements (
    id bigint NOT NULL,
    name text NOT NULL,
    region text,
    district text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: settlements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.settlements_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: settlements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.settlements_id_seq OWNED BY public.settlements.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    username text NOT NULL,
    password_hash text NOT NULL,
    role text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'viewer'::text])))
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: water_bodies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.water_bodies (
    id bigint NOT NULL,
    name text NOT NULL,
    water_body_type text NOT NULL,
    basin text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT water_bodies_water_body_type_check CHECK ((water_body_type = ANY (ARRAY['река'::text, 'озеро'::text, 'резервуар'::text, 'канал'::text])))
);


--
-- Name: water_bodies_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.water_bodies_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: water_bodies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.water_bodies_id_seq OWNED BY public.water_bodies.id;


--
-- Name: water_level_measurements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.water_level_measurements (
    id bigint NOT NULL,
    sensor_id text NOT NULL,
    packet_id bigint,
    distance_cm real,
    water_level_cm real,
    hop_count integer,
    rssi integer,
    snr real,
    measured_at timestamp with time zone DEFAULT now() NOT NULL,
    received_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: water_level_measurements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.water_level_measurements_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: water_level_measurements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.water_level_measurements_id_seq OWNED BY public.water_level_measurements.id;


--
-- Name: alerts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerts ALTER COLUMN id SET DEFAULT nextval('public.alerts_id_seq'::regclass);


--
-- Name: monitoring_stations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monitoring_stations ALTER COLUMN id SET DEFAULT nextval('public.monitoring_stations_id_seq'::regclass);


--
-- Name: settlements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settlements ALTER COLUMN id SET DEFAULT nextval('public.settlements_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: water_bodies id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.water_bodies ALTER COLUMN id SET DEFAULT nextval('public.water_bodies_id_seq'::regclass);


--
-- Name: water_level_measurements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.water_level_measurements ALTER COLUMN id SET DEFAULT nextval('public.water_level_measurements_id_seq'::regclass);


--
-- Data for Name: alerts; Type: TABLE DATA; Schema: public; Owner: -
--

-- Data for public.alerts
INSERT INTO public.alerts (id, monitoring_station_id, measurement_id, alert_type, message, created_at, resolved_at) VALUES ('1', '1', '190', 'danger', 'Опасный уровень воды: 400 см', '2026-06-04 03:35:30.96053+09', '2026-06-04 03:35:40.97456+09');
INSERT INTO public.alerts (id, monitoring_station_id, measurement_id, alert_type, message, created_at, resolved_at) VALUES ('3', '1', '192', 'danger', 'Опасный уровень воды: 370 см', '2026-06-04 03:36:00.831099+09', '2026-06-04 03:50:10.026031+09');
INSERT INTO public.alerts (id, monitoring_station_id, measurement_id, alert_type, message, created_at, resolved_at) VALUES ('2', '1', '191', 'critical', 'Критический уровень воды: 420 см', '2026-06-04 03:35:40.97456+09', '2026-06-04 15:01:36.421245+09');


--
-- Data for Name: monitoring_stations; Type: TABLE DATA; Schema: public; Owner: -
--

-- Data for public.monitoring_stations
INSERT INTO public.monitoring_stations (id, water_body_id, settlement_id, name, station_code, danger_level_cm, critical_level_cm, is_active, created_at, latitude, longitude, sensor_height_cm, sensor_angle_deg) VALUES ('1', '1', '1', 'Гидропост Якутск', 'LEN-YKT-001', '320', '420', 't', '2026-06-03 21:22:45.434713+09', '62.0272', '129.7322', '620', '0');
INSERT INTO public.monitoring_stations (id, water_body_id, settlement_id, name, station_code, danger_level_cm, critical_level_cm, is_active, created_at, latitude, longitude, sensor_height_cm, sensor_angle_deg) VALUES ('2', '1', '2', 'Гидропост Покровск', 'LEN-PKR-002', '300', '390', 't', '2026-06-03 21:22:45.434713+09', '61.4844', '129.1482', '580', '0');
INSERT INTO public.monitoring_stations (id, water_body_id, settlement_id, name, station_code, danger_level_cm, critical_level_cm, is_active, created_at, latitude, longitude, sensor_height_cm, sensor_angle_deg) VALUES ('3', '3', '3', 'Гидропост Оймякон', 'IND-OYM-003', '260', '340', 't', '2026-06-03 21:22:45.434713+09', '63.4641', '142.7737', '520', '8');
INSERT INTO public.monitoring_stations (id, water_body_id, settlement_id, name, station_code, danger_level_cm, critical_level_cm, is_active, created_at, latitude, longitude, sensor_height_cm, sensor_angle_deg) VALUES ('4', '3', '4', 'Гидропост Усть-Нера', 'IND-UNR-004', '280', '360', 't', '2026-06-03 21:22:45.434713+09', '64.5667', '143.2', '540', '5');
INSERT INTO public.monitoring_stations (id, water_body_id, settlement_id, name, station_code, danger_level_cm, critical_level_cm, is_active, created_at, latitude, longitude, sensor_height_cm, sensor_angle_deg) VALUES ('5', '4', '5', 'Гидропост Среднеколымск', 'KOL-SRK-005', '310', '410', 't', '2026-06-03 21:22:45.434713+09', '67.4582', '153.7069', '600', '0');


--
-- Data for Name: sensors; Type: TABLE DATA; Schema: public; Owner: -
--

-- Data for public.sensors
INSERT INTO public.sensors (sensor_id, monitoring_station_id, name, sensor_type, is_active, created_at) VALUES ('001', '1', 'HC-SR04/LoRa 001', 'ultrasonic', 't', '2026-06-03 21:22:45.434713+09');
INSERT INTO public.sensors (sensor_id, monitoring_station_id, name, sensor_type, is_active, created_at) VALUES ('002', '2', 'HC-SR04/LoRa 002', 'ultrasonic', 't', '2026-06-03 21:22:45.434713+09');
INSERT INTO public.sensors (sensor_id, monitoring_station_id, name, sensor_type, is_active, created_at) VALUES ('003', '3', 'HC-SR04/LoRa 003', 'ultrasonic', 't', '2026-06-03 21:22:45.434713+09');
INSERT INTO public.sensors (sensor_id, monitoring_station_id, name, sensor_type, is_active, created_at) VALUES ('004', '4', 'HC-SR04/LoRa 004', 'ultrasonic', 't', '2026-06-03 21:22:45.434713+09');
INSERT INTO public.sensors (sensor_id, monitoring_station_id, name, sensor_type, is_active, created_at) VALUES ('005', '5', 'HC-SR04/LoRa 005', 'ultrasonic', 't', '2026-06-03 21:22:45.434713+09');


--
-- Data for Name: settlements; Type: TABLE DATA; Schema: public; Owner: -
--

-- Data for public.settlements
INSERT INTO public.settlements (id, name, region, district, created_at) VALUES ('1', 'Якутск', 'Республика Саха (Якутия)', 'городской округ Якутск', '2026-06-03 21:22:45.434713+09');
INSERT INTO public.settlements (id, name, region, district, created_at) VALUES ('2', 'Покровск', 'Республика Саха (Якутия)', 'Хангаласский улус', '2026-06-03 21:22:45.434713+09');
INSERT INTO public.settlements (id, name, region, district, created_at) VALUES ('3', 'Оймякон', 'Республика Саха (Якутия)', 'Оймяконский улус', '2026-06-03 21:22:45.434713+09');
INSERT INTO public.settlements (id, name, region, district, created_at) VALUES ('4', 'Усть-Нера', 'Республика Саха (Якутия)', 'Оймяконский улус', '2026-06-03 21:22:45.434713+09');
INSERT INTO public.settlements (id, name, region, district, created_at) VALUES ('5', 'Среднеколымск', 'Республика Саха (Якутия)', 'Среднеколымский улус', '2026-06-03 21:22:45.434713+09');


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

-- Data for public.users
INSERT INTO public.users (id, username, password_hash, role, created_at, updated_at) VALUES ('1', 'admin', 'scrypt:04ea07ab8d51790211d2e1d992404a85:337d69cd136f7f03fd5112598b2dad554f75f33c40bd7597c7e07988facd3dd0338c21a88c8330eeb669e516babf965f95f35649fffb2c34a5c1669ffa99c33e', 'admin', '2026-06-03 21:40:53.349018+09', '2026-06-03 21:40:53.349018+09');
INSERT INTO public.users (id, username, password_hash, role, created_at, updated_at) VALUES ('2', 'viewer', 'scrypt:bdaea88341097e9fbb9d2171c5839f72:eb0b026f72133f0b25b75e022bb73485117c2b0a49d59dc3d57adfebe76080591aae0bbe8d9e7862e009fd294db9de45460065e3c2071263da2c74a93d273661', 'viewer', '2026-06-03 21:40:53.349018+09', '2026-06-03 21:40:53.349018+09');


--
-- Data for Name: water_bodies; Type: TABLE DATA; Schema: public; Owner: -
--

-- Data for public.water_bodies
INSERT INTO public.water_bodies (id, name, water_body_type, basin, created_at) VALUES ('1', 'Лена', 'река', 'Ленский бассейн', '2026-06-03 21:22:45.434713+09');
INSERT INTO public.water_bodies (id, name, water_body_type, basin, created_at) VALUES ('2', 'Алдан', 'река', 'Ленский бассейн', '2026-06-03 21:22:45.434713+09');
INSERT INTO public.water_bodies (id, name, water_body_type, basin, created_at) VALUES ('3', 'Индигирка', 'река', 'Восточная Якутия', '2026-06-03 21:22:45.434713+09');
INSERT INTO public.water_bodies (id, name, water_body_type, basin, created_at) VALUES ('4', 'Колыма', 'река', 'Северо-Восточная Якутия', '2026-06-03 21:22:45.434713+09');


--
-- Data for Name: water_level_measurements; Type: TABLE DATA; Schema: public; Owner: -
--

-- Data for public.water_level_measurements
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('1', '001', '31', '61.36', '558.64', '0', '-59', '9.75', '2026-05-17 08:21:50.492187+09', '2026-05-17 08:21:50.492187+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('2', '001', '32', '61.3', '558.7', '0', '-58', '9.75', '2026-05-17 08:22:00.425149+09', '2026-05-17 08:22:00.425149+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('3', '001', '33', '61.42', '558.58', '0', '-58', '10', '2026-05-17 08:22:10.426363+09', '2026-05-17 08:22:10.426363+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('4', '001', '34', '61.43', '558.57', '0', '-58', '9.25', '2026-05-17 08:22:20.42756+09', '2026-05-17 08:22:20.42756+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('5', '001', '35', '61.41', '558.59', '0', '-59', '10.25', '2026-05-17 08:22:30.427762+09', '2026-05-17 08:22:30.427762+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('6', '001', '36', '61.59', '558.41', '0', '-57', '9.5', '2026-05-17 08:22:40.429183+09', '2026-05-17 08:22:40.429183+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('7', '001', '37', '61.51', '558.49', '0', '-56', '9.5', '2026-05-17 08:22:50.429791+09', '2026-05-17 08:22:50.429791+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('8', '001', '38', '61.03', '558.97', '0', '-56', '9.75', '2026-05-17 08:23:00.430564+09', '2026-05-17 08:23:00.430564+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('9', '001', '39', '61.1', '558.9', '0', '-57', '9.75', '2026-05-17 08:23:10.431117+09', '2026-05-17 08:23:10.431117+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('10', '001', '40', '61.05', '558.95', '0', '-57', '10.25', '2026-05-17 08:23:20.432324+09', '2026-05-17 08:23:20.432324+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('11', '001', '41', '61.42', '558.58', '0', '-57', '10', '2026-05-17 08:23:30.433652+09', '2026-05-17 08:23:30.433652+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('12', '001', '42', '61.28', '558.72', '0', '-57', '9.25', '2026-05-17 08:23:40.433811+09', '2026-05-17 08:23:40.433811+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('13', '001', '43', '61.3', '558.7', '0', '-57', '9.25', '2026-05-17 08:23:50.435189+09', '2026-05-17 08:23:50.435189+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('14', '001', '44', '61.35', '558.65', '0', '-57', '9.25', '2026-05-17 08:24:00.436662+09', '2026-05-17 08:24:00.436662+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('15', '001', '45', '61.15', '558.85', '0', '-57', '9.75', '2026-05-17 08:24:10.436684+09', '2026-05-17 08:24:10.436684+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('16', '001', '46', '61.26', '558.74', '0', '-57', '9.75', '2026-05-17 08:24:20.438471+09', '2026-05-17 08:24:20.438471+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('17', '001', '47', '61.6', '558.4', '0', '-57', '10', '2026-05-17 08:24:30.438915+09', '2026-05-17 08:24:30.438915+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('18', '001', '48', '61.43', '558.57', '0', '-57', '9.75', '2026-05-17 08:24:40.439716+09', '2026-05-17 08:24:40.439716+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('19', '001', '49', '61.47', '558.53', '0', '-57', '10', '2026-05-17 08:24:50.441224+09', '2026-05-17 08:24:50.441224+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('20', '001', '50', '61.3', '558.7', '0', '-57', '9.75', '2026-05-17 08:25:00.441642+09', '2026-05-17 08:25:00.441642+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('21', '001', '51', '61.03', '558.97', '0', '-56', '9.5', '2026-05-17 08:25:10.442571+09', '2026-05-17 08:25:10.442571+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('22', '001', '52', '61.44', '558.56', '0', '-57', '9.75', '2026-05-17 08:25:20.444266+09', '2026-05-17 08:25:20.444266+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('23', '001', '53', '61.51', '558.49', '0', '-57', '9.75', '2026-05-17 08:25:30.444775+09', '2026-05-17 08:25:30.444775+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('24', '001', '54', '61.1', '558.9', '0', '-57', '9.5', '2026-05-17 08:25:40.445679+09', '2026-05-17 08:25:40.445679+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('25', '001', '55', '61.46', '558.54', '0', '-57', '10', '2026-05-17 08:25:50.446168+09', '2026-05-17 08:25:50.446168+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('26', '001', '56', '61.41', '558.59', '0', '-57', '9.75', '2026-05-17 08:26:00.447822+09', '2026-05-17 08:26:00.447822+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('27', '001', '57', '61.3', '558.7', '0', '-56', '9.75', '2026-05-17 08:26:10.448793+09', '2026-05-17 08:26:10.448793+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('28', '001', '58', '61.31', '558.69', '0', '-57', '9.5', '2026-05-17 08:26:20.449017+09', '2026-05-17 08:26:20.449017+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('29', '001', '59', '61.3', '558.7', '0', '-57', '9.75', '2026-05-17 08:26:30.45027+09', '2026-05-17 08:26:30.45027+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('30', '001', '60', '61.18', '558.82', '0', '-57', '12', '2026-05-17 08:26:40.451739+09', '2026-05-17 08:26:40.451739+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('31', '001', '61', '61.16', '558.84', '0', '-58', '10', '2026-05-17 08:26:50.451863+09', '2026-05-17 08:26:50.451863+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('32', '001', '62', '61.25', '558.75', '0', '-57', '10', '2026-05-17 08:27:00.45347+09', '2026-05-17 08:27:00.45347+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('33', '001', '63', '61.18', '558.82', '0', '-56', '9.5', '2026-05-17 08:27:10.453525+09', '2026-05-17 08:27:10.453525+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('34', '001', '64', '61.44', '558.56', '0', '-57', '9.5', '2026-05-17 08:27:20.454917+09', '2026-05-17 08:27:20.454917+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('35', '001', '65', '61.21', '558.79', '0', '-57', '10.75', '2026-05-17 08:27:30.456188+09', '2026-05-17 08:27:30.456188+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('36', '001', '66', '61.11', '558.89', '0', '-57', '9.25', '2026-05-17 08:27:40.456676+09', '2026-05-17 08:27:40.456676+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('37', '001', '67', '61.19', '558.81', '0', '-57', '9.75', '2026-05-17 08:27:50.458013+09', '2026-05-17 08:27:50.458013+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('38', '001', '68', '61.47', '558.53', '0', '-57', '9.75', '2026-05-17 08:28:00.459216+09', '2026-05-17 08:28:00.459216+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('39', '001', '69', '61.44', '558.56', '0', '-57', '9.75', '2026-05-17 08:28:10.459702+09', '2026-05-17 08:28:10.459702+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('40', '001', '70', '61.34', '558.66', '0', '-57', '9.75', '2026-05-17 08:28:20.461187+09', '2026-05-17 08:28:20.461187+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('41', '001', '71', '61.53', '558.47', '0', '-57', '10.25', '2026-05-17 08:28:30.461315+09', '2026-05-17 08:28:30.461315+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('42', '001', '72', '61.44', '558.56', '0', '-57', '9.75', '2026-05-17 08:28:40.462556+09', '2026-05-17 08:28:40.462556+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('43', '001', '73', '61.36', '558.64', '0', '-57', '9.5', '2026-05-17 08:28:50.463809+09', '2026-05-17 08:28:50.463809+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('44', '001', '74', '61.45', '558.55', '0', '-57', '10.25', '2026-05-17 08:29:00.464373+09', '2026-05-17 08:29:00.464373+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('45', '001', '75', '61.34', '558.66', '0', '-57', '9.25', '2026-05-17 08:29:10.465312+09', '2026-05-17 08:29:10.465312+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('46', '001', '76', '61.05', '558.95', '0', '-56', '10.25', '2026-05-17 08:29:20.466802+09', '2026-05-17 08:29:20.466802+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('47', '001', '77', '61.02', '558.98', '0', '-57', '9.75', '2026-05-17 08:29:30.467111+09', '2026-05-17 08:29:30.467111+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('48', '001', '78', '61.18', '558.82', '0', '-57', '9.5', '2026-05-17 08:29:40.46823+09', '2026-05-17 08:29:40.46823+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('49', '001', '79', '61.42', '558.58', '0', '-57', '10', '2026-05-17 08:29:50.468857+09', '2026-05-17 08:29:50.468857+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('50', '001', '80', '61.2', '558.8', '0', '-56', '9.5', '2026-05-17 08:30:00.470118+09', '2026-05-17 08:30:00.470118+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('51', '001', '81', '61.48', '558.52', '0', '-57', '9.25', '2026-05-17 08:30:10.471382+09', '2026-05-17 08:30:10.471382+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('52', '001', '82', '61.12', '558.88', '0', '-57', '9.75', '2026-05-17 08:30:20.471334+09', '2026-05-17 08:30:20.471334+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('53', '001', '83', '61.55', '558.45', '0', '-57', '10.5', '2026-05-17 08:30:30.473119+09', '2026-05-17 08:30:30.473119+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('54', '001', '84', '61.11', '558.89', '0', '-57', '10', '2026-05-17 08:30:40.474277+09', '2026-05-17 08:30:40.474277+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('55', '001', '85', '61.65', '558.35', '0', '-57', '9.5', '2026-05-17 08:30:50.474638+09', '2026-05-17 08:30:50.474638+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('56', '001', '86', '61.52', '558.48', '0', '-57', '9.75', '2026-05-17 08:31:00.476133+09', '2026-05-17 08:31:00.476133+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('57', '001', '87', '61.43', '558.57', '0', '-57', '9.75', '2026-05-17 08:31:10.47632+09', '2026-05-17 08:31:10.47632+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('58', '001', '88', '61.49', '558.51', '0', '-56', '9.75', '2026-05-17 08:31:20.477617+09', '2026-05-17 08:31:20.477617+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('59', '001', '89', '61.49', '558.51', '0', '-57', '9.25', '2026-05-17 08:31:30.478895+09', '2026-05-17 08:31:30.478895+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('60', '001', '90', '61.36', '558.64', '0', '-57', '10.25', '2026-05-17 08:31:40.478968+09', '2026-05-17 08:31:40.478968+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('61', '001', '91', '61.61', '558.39', '0', '-57', '9.5', '2026-05-17 08:31:50.480418+09', '2026-05-17 08:31:50.480418+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('62', '001', '92', '61.47', '558.53', '0', '-57', '10.5', '2026-05-17 08:32:00.48195+09', '2026-05-17 08:32:00.48195+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('63', '001', '93', '61.57', '558.43', '0', '-56', '10', '2026-05-17 08:32:10.482217+09', '2026-05-17 08:32:10.482217+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('64', '001', '94', '61.28', '558.72', '0', '-56', '9.5', '2026-05-17 08:32:20.483351+09', '2026-05-17 08:32:20.483351+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('65', '001', '95', '61.57', '558.43', '0', '-56', '10.25', '2026-05-17 08:32:30.484084+09', '2026-05-17 08:32:30.484084+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('66', '001', '96', '61.39', '558.61', '0', '-57', '9.75', '2026-05-17 08:32:40.484976+09', '2026-05-17 08:32:40.484976+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('67', '001', '97', '61.48', '558.52', '0', '-56', '10', '2026-05-17 08:32:50.486715+09', '2026-05-17 08:32:50.486715+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('68', '001', '98', '61.46', '558.54', '0', '-57', '9.5', '2026-05-17 08:33:00.486629+09', '2026-05-17 08:33:00.486629+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('69', '001', '99', '61.54', '558.46', '0', '-57', '10', '2026-05-17 08:33:10.488057+09', '2026-05-17 08:33:10.488057+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('70', '001', '100', '61.52', '558.48', '0', '-57', '9.5', '2026-05-17 08:33:20.490592+09', '2026-05-17 08:33:20.490592+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('71', '001', '101', '61.14', '558.86', '0', '-56', '9.5', '2026-05-17 08:33:30.490657+09', '2026-05-17 08:33:30.490657+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('72', '001', '102', '61.31', '558.69', '0', '-57', '9.5', '2026-05-17 08:33:40.491769+09', '2026-05-17 08:33:40.491769+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('73', '001', '103', '61.04', '558.96', '0', '-57', '9.25', '2026-05-17 08:33:50.492279+09', '2026-05-17 08:33:50.492279+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('74', '001', '104', '61.43', '558.57', '0', '-57', '10', '2026-05-17 08:34:00.493503+09', '2026-05-17 08:34:00.493503+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('75', '001', '105', '61.45', '558.55', '0', '-57', '9.5', '2026-05-17 08:34:10.494895+09', '2026-05-17 08:34:10.494895+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('76', '001', '106', '61.54', '558.46', '0', '-57', '9.5', '2026-05-17 08:34:20.495178+09', '2026-05-17 08:34:20.495178+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('77', '001', '108', '61.53', '558.47', '0', '-57', '10', '2026-05-17 08:34:40.548189+09', '2026-05-17 08:34:40.548189+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('78', '001', '109', '61.02', '558.98', '0', '-57', '9.5', '2026-05-17 08:34:50.498001+09', '2026-05-17 08:34:50.498001+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('79', '001', '110', '61.37', '558.63', '0', '-57', '9.25', '2026-05-17 08:35:00.499263+09', '2026-05-17 08:35:00.499263+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('80', '001', '111', '61.24', '558.76', '0', '-57', '9.5', '2026-05-17 08:35:10.499503+09', '2026-05-17 08:35:10.499503+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('81', '001', '112', '61.55', '558.45', '0', '-57', '9.5', '2026-05-17 08:35:20.500781+09', '2026-05-17 08:35:20.500781+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('82', '001', '113', '61.27', '558.73', '0', '-57', '9.25', '2026-05-17 08:35:30.501954+09', '2026-05-17 08:35:30.501954+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('83', '001', '114', '61.03', '558.97', '0', '-57', '9.25', '2026-05-17 08:35:40.50233+09', '2026-05-17 08:35:40.50233+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('84', '001', '115', '61.24', '558.76', '0', '-57', '9.5', '2026-05-17 08:35:50.503551+09', '2026-05-17 08:35:50.503551+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('85', '001', '116', '61.21', '558.79', '0', '-57', '9', '2026-05-17 08:36:00.505268+09', '2026-05-17 08:36:00.505268+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('86', '001', '117', '61.37', '558.63', '0', '-57', '9', '2026-05-17 08:36:10.505183+09', '2026-05-17 08:36:10.505183+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('87', '001', '118', '61.35', '558.65', '0', '-57', '9.5', '2026-05-17 08:36:20.506702+09', '2026-05-17 08:36:20.506702+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('88', '001', '119', '61.55', '558.45', '0', '-57', '9.25', '2026-05-17 08:36:30.507027+09', '2026-05-17 08:36:30.507027+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('89', '001', '120', '61.27', '558.73', '0', '-57', '9.25', '2026-05-17 08:36:40.508072+09', '2026-05-17 08:36:40.508072+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('90', '001', '121', '61.32', '558.68', '0', '-57', '9.25', '2026-05-17 08:36:50.509345+09', '2026-05-17 08:36:50.509345+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('91', '001', '122', '61.28', '558.72', '0', '-57', '9', '2026-05-17 08:37:00.509724+09', '2026-05-17 08:37:00.509724+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('92', '001', '123', '61.03', '558.97', '0', '-57', '9.5', '2026-05-17 08:37:10.510899+09', '2026-05-17 08:37:10.510899+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('93', '001', '124', '61.49', '558.51', '0', '-56', '9.5', '2026-05-17 08:37:20.512266+09', '2026-05-17 08:37:20.512266+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('94', '001', '125', '61.18', '558.82', '0', '-57', '9.5', '2026-05-17 08:37:30.512537+09', '2026-05-17 08:37:30.512537+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('95', '001', '126', '61.45', '558.55', '0', '-57', '9.75', '2026-05-17 08:37:40.514079+09', '2026-05-17 08:37:40.514079+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('96', '001', '127', '61.02', '558.98', '0', '-57', '9.5', '2026-05-17 08:37:50.513888+09', '2026-05-17 08:37:50.513888+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('97', '001', '128', '61.02', '558.98', '0', '-57', '9.25', '2026-05-17 08:38:00.515124+09', '2026-05-17 08:38:00.515124+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('98', '001', '129', '61.51', '558.49', '0', '-56', '9.5', '2026-05-17 08:38:10.516869+09', '2026-05-17 08:38:10.516869+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('99', '001', '130', '61.13', '558.87', '0', '-57', '9.5', '2026-05-17 08:38:20.51689+09', '2026-05-17 08:38:20.51689+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('100', '001', '131', '61.19', '558.81', '0', '-57', '9.75', '2026-05-17 08:38:30.518259+09', '2026-05-17 08:38:30.518259+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('101', '001', '132', '61.53', '558.47', '0', '-57', '9.25', '2026-05-17 08:38:40.519568+09', '2026-05-17 08:38:40.519568+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('102', '001', '133', '61.44', '558.56', '0', '-57', '9.25', '2026-05-17 08:38:50.519812+09', '2026-05-17 08:38:50.519812+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('103', '001', '134', '61.02', '558.98', '0', '-57', '9.25', '2026-05-17 08:39:00.520859+09', '2026-05-17 08:39:00.520859+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('104', '001', '135', '61.24', '558.76', '0', '-57', '9.75', '2026-05-17 08:39:10.521563+09', '2026-05-17 08:39:10.521563+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('105', '001', '136', '61.16', '558.84', '0', '-57', '9.5', '2026-05-17 08:39:20.522752+09', '2026-05-17 08:39:20.522752+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('106', '001', '137', '61.36', '558.64', '0', '-57', '10', '2026-05-17 08:39:30.52382+09', '2026-05-17 08:39:30.52382+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('107', '001', '138', '61.61', '558.39', '0', '-57', '9.25', '2026-05-17 08:39:40.524622+09', '2026-05-17 08:39:40.524622+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('108', '001', '139', '61.36', '558.64', '0', '-56', '9', '2026-05-17 08:39:50.526023+09', '2026-05-17 08:39:50.526023+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('109', '001', '140', '61.36', '558.64', '0', '-57', '10', '2026-05-17 08:40:00.526867+09', '2026-05-17 08:40:00.526867+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('110', '001', '141', '61.06', '558.94', '0', '-57', '9.5', '2026-05-17 08:40:10.527412+09', '2026-05-17 08:40:10.527412+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('111', '001', '142', '61.19', '558.81', '0', '-57', '9.25', '2026-05-17 08:40:20.528413+09', '2026-05-17 08:40:20.528413+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('112', '001', '143', '61.08', '558.92', '0', '-56', '9.5', '2026-05-17 08:40:30.528617+09', '2026-05-17 08:40:30.528617+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('113', '001', '144', '61.17', '558.83', '0', '-57', '9.25', '2026-05-17 08:40:40.530102+09', '2026-05-17 08:40:40.530102+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('114', '001', '145', '61.14', '558.86', '0', '-57', '9.25', '2026-05-17 08:40:50.531223+09', '2026-05-17 08:40:50.531223+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('115', '001', '146', '61.68', '558.32', '0', '-57', '9', '2026-05-17 08:41:00.531659+09', '2026-05-17 08:41:00.531659+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('116', '001', '147', '61.62', '558.38', '0', '-57', '9.75', '2026-05-17 08:41:10.533071+09', '2026-05-17 08:41:10.533071+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('117', '001', '148', '61.12', '558.88', '0', '-57', '9.5', '2026-05-17 08:41:20.534242+09', '2026-05-17 08:41:20.534242+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('118', '001', '149', '61.57', '558.43', '0', '-57', '9.5', '2026-05-17 08:41:30.534671+09', '2026-05-17 08:41:30.534671+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('119', '001', '150', '61.21', '558.79', '0', '-57', '9.5', '2026-05-17 08:41:40.535652+09', '2026-05-17 08:41:40.535652+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('120', '001', '151', '61.39', '558.61', '0', '-57', '9.75', '2026-05-17 08:41:50.536212+09', '2026-05-17 08:41:50.536212+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('121', '001', '152', '61.31', '558.69', '0', '-57', '9.25', '2026-05-17 08:42:00.537469+09', '2026-05-17 08:42:00.537469+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('122', '001', '153', '61.28', '558.72', '0', '-57', '9', '2026-05-17 08:42:10.538727+09', '2026-05-17 08:42:10.538727+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('123', '001', '154', '61.32', '558.68', '0', '-57', '9', '2026-05-17 08:42:20.539092+09', '2026-05-17 08:42:20.539092+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('124', '001', '155', '61.14', '558.86', '0', '-56', '9', '2026-05-17 08:42:30.540401+09', '2026-05-17 08:42:30.540401+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('125', '001', '156', '61.17', '558.83', '0', '-57', '9.5', '2026-05-17 08:42:40.541774+09', '2026-05-17 08:42:40.541774+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('126', '001', '157', '61.19', '558.81', '0', '-57', '10', '2026-05-17 08:42:50.541696+09', '2026-05-17 08:42:50.541696+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('127', '001', '158', '61.06', '558.94', '0', '-57', '9.5', '2026-05-17 08:43:00.543104+09', '2026-05-17 08:43:00.543104+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('128', '001', '159', '61.04', '558.96', '0', '-57', '9.25', '2026-05-17 08:43:10.54327+09', '2026-05-17 08:43:10.54327+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('129', '001', '160', '61.02', '558.98', '0', '-57', '9.25', '2026-05-17 08:43:20.544724+09', '2026-05-17 08:43:20.544724+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('130', '001', '161', '61.19', '558.81', '0', '-56', '9.75', '2026-05-17 08:43:30.546011+09', '2026-05-17 08:43:30.546011+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('131', '001', '162', '61.13', '558.87', '0', '-57', '9.25', '2026-05-17 08:43:40.546327+09', '2026-05-17 08:43:40.546327+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('132', '001', '163', '61.06', '558.94', '0', '-57', '9.25', '2026-05-17 08:43:50.547581+09', '2026-05-17 08:43:50.547581+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('133', '001', '164', '61.05', '558.95', '0', '-57', '10.5', '2026-05-17 08:44:00.548883+09', '2026-05-17 08:44:00.548883+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('134', '001', '165', '61.46', '558.54', '0', '-57', '9.75', '2026-05-17 08:44:10.549429+09', '2026-05-17 08:44:10.549429+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('135', '001', '166', '61.03', '558.97', '0', '-57', '9.75', '2026-05-17 08:44:20.550199+09', '2026-05-17 08:44:20.550199+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('136', '001', '167', '61.04', '558.96', '0', '-57', '9.75', '2026-05-17 08:44:30.550496+09', '2026-05-17 08:44:30.550496+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('137', '001', '168', '61.28', '558.72', '0', '-57', '9.25', '2026-05-17 08:44:40.5521+09', '2026-05-17 08:44:40.5521+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('138', '001', '169', '61.03', '558.97', '0', '-57', '10', '2026-05-17 08:44:50.553319+09', '2026-05-17 08:44:50.553319+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('139', '001', '170', '61.07', '558.93', '0', '-57', '9.75', '2026-05-17 08:45:00.553852+09', '2026-05-17 08:45:00.553852+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('140', '001', '171', '61.37', '558.63', '0', '-57', '9.5', '2026-05-17 08:45:10.555213+09', '2026-05-17 08:45:10.555213+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('141', '001', '172', '61.13', '558.87', '0', '-57', '9.5', '2026-05-17 08:45:20.556575+09', '2026-05-17 08:45:20.556575+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('142', '001', '173', '61.32', '558.68', '0', '-57', '9.25', '2026-05-17 08:45:30.556601+09', '2026-05-17 08:45:30.556601+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('143', '001', '174', '61.2', '558.8', '0', '-57', '9', '2026-05-17 08:45:40.558068+09', '2026-05-17 08:45:40.558068+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('144', '001', '175', '61.04', '558.96', '0', '-57', '9.5', '2026-05-17 08:45:50.5579+09', '2026-05-17 08:45:50.5579+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('145', '001', '176', '61.05', '558.95', '0', '-57', '9.75', '2026-05-17 08:46:00.559632+09', '2026-05-17 08:46:00.559632+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('146', '001', '177', '61.14', '558.86', '0', '-58', '9', '2026-05-17 08:46:10.560917+09', '2026-05-17 08:46:10.560917+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('147', '001', '178', '61.06', '558.94', '0', '-57', '9.5', '2026-05-17 08:46:20.560897+09', '2026-05-17 08:46:20.560897+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('148', '001', '179', '61.12', '558.88', '0', '-57', '9.75', '2026-05-17 08:46:30.562239+09', '2026-05-17 08:46:30.562239+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('149', '001', '180', '61.11', '558.89', '0', '-57', '9.5', '2026-05-17 08:46:40.563513+09', '2026-05-17 08:46:40.563513+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('150', '001', '181', '61.03', '558.97', '0', '-57', '9.5', '2026-05-17 08:46:50.563738+09', '2026-05-17 08:46:50.563738+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('151', '001', '182', '61.03', '558.97', '0', '-57', '9.5', '2026-05-17 08:47:00.565195+09', '2026-05-17 08:47:00.565195+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('152', '001', '183', '61.02', '558.98', '0', '-57', '8.5', '2026-05-17 08:47:10.56551+09', '2026-05-17 08:47:10.56551+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('153', '001', '184', '61.02', '558.98', '0', '-57', '9.5', '2026-05-17 08:47:20.566745+09', '2026-05-17 08:47:20.566745+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('154', '001', '185', '61.34', '558.66', '0', '-57', '9', '2026-05-17 08:47:30.568142+09', '2026-05-17 08:47:30.568142+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('155', '001', '186', '61.39', '558.61', '0', '-57', '9.25', '2026-05-17 08:47:40.568661+09', '2026-05-17 08:47:40.568661+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('156', '001', '187', '61.35', '558.65', '0', '-57', '9.75', '2026-05-17 08:47:50.569848+09', '2026-05-17 08:47:50.569848+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('157', '001', '188', '61.34', '558.66', '0', '-56', '9.25', '2026-05-17 08:48:00.571456+09', '2026-05-17 08:48:00.571456+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('158', '001', '189', '61.3', '558.7', '0', '-57', '9.25', '2026-05-17 08:48:10.571492+09', '2026-05-17 08:48:10.571492+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('159', '001', '190', '61.1', '558.9', '0', '-57', '9.75', '2026-05-17 08:48:20.572755+09', '2026-05-17 08:48:20.572755+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('160', '001', '191', '61.04', '558.96', '0', '-57', '9', '2026-05-17 08:48:30.572974+09', '2026-05-17 08:48:30.572974+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('161', '001', '192', '61.19', '558.81', '0', '-57', '10', '2026-05-17 08:48:40.574142+09', '2026-05-17 08:48:40.574142+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('162', '001', '193', '61.31', '558.69', '0', '-57', '9', '2026-05-17 08:48:50.575662+09', '2026-05-17 08:48:50.575662+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('163', '001', '194', '61.02', '558.98', '0', '-57', '9.5', '2026-05-17 08:49:00.575847+09', '2026-05-17 08:49:00.575847+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('164', '001', '195', '61.2', '558.8', '0', '-57', '9.25', '2026-05-17 08:49:10.577312+09', '2026-05-17 08:49:10.577312+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('165', '001', '196', '61.59', '558.41', '0', '-57', '9.5', '2026-05-17 08:49:20.578789+09', '2026-05-17 08:49:20.578789+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('166', '001', '197', '61.06', '558.94', '0', '-57', '9', '2026-05-17 08:49:30.57867+09', '2026-05-17 08:49:30.57867+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('167', '001', '198', '61.33', '558.67', '0', '-57', '10', '2026-05-17 08:49:40.580163+09', '2026-05-17 08:49:40.580163+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('168', '001', '199', '61.21', '558.79', '0', '-57', '9.25', '2026-05-17 08:49:50.580553+09', '2026-05-17 08:49:50.580553+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('169', '001', '200', '61.03', '558.97', '0', '-56', '9.75', '2026-05-17 08:50:00.58129+09', '2026-05-17 08:50:00.58129+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('170', '001', '201', '61.05', '558.95', '0', '-57', '9.5', '2026-05-17 08:50:10.583071+09', '2026-05-17 08:50:10.583071+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('171', '001', '202', '61.14', '558.86', '0', '-57', '9.5', '2026-05-17 08:50:20.583268+09', '2026-05-17 08:50:20.583268+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('172', '001', '203', '61.04', '558.96', '0', '-57', '9.5', '2026-05-17 08:50:30.584403+09', '2026-05-17 08:50:30.584403+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('173', '001', '204', '61.4', '558.6', '0', '-57', '9.25', '2026-05-17 08:50:40.585848+09', '2026-05-17 08:50:40.585848+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('174', '001', '205', '61.39', '558.61', '0', '-57', '9.75', '2026-05-17 08:50:50.586249+09', '2026-05-17 08:50:50.586249+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('175', '001', '206', '61.4', '558.6', '0', '-57', '9.75', '2026-05-17 08:51:00.587505+09', '2026-05-17 08:51:00.587505+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('176', '001', '207', '61.18', '558.82', '0', '-57', '9.5', '2026-05-17 08:51:10.587469+09', '2026-05-17 08:51:10.587469+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('177', '001', '208', '61.46', '558.54', '0', '-57', '9.5', '2026-05-17 08:51:20.58901+09', '2026-05-17 08:51:20.58901+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('178', '001', '209', '61.06', '558.94', '0', '-57', '9.5', '2026-05-17 08:51:30.590095+09', '2026-05-17 08:51:30.590095+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('179', '001', '210', '61.14', '558.86', '0', '-57', '9.75', '2026-05-17 08:51:40.590265+09', '2026-05-17 08:51:40.590265+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('180', '001', '211', '61.14', '558.86', '0', '-57', '9.25', '2026-05-17 08:51:50.59169+09', '2026-05-17 08:51:50.59169+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('181', '001', '212', '61.32', '558.68', '0', '-57', '9.5', '2026-05-17 08:52:00.593054+09', '2026-05-17 08:52:00.593054+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('182', '001', '213', '61.49', '558.51', '0', '-57', '10', '2026-05-17 08:52:10.593423+09', '2026-05-17 08:52:10.593423+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('183', '001', '214', '61.37', '558.63', '0', '-57', '9.25', '2026-05-17 08:52:20.594435+09', '2026-05-17 08:52:20.594435+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('184', '001', '215', '61.3', '558.7', '0', '-57', '9', '2026-05-17 08:52:30.595034+09', '2026-05-17 08:52:30.595034+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('185', '001', '216', '61.13', '558.87', '0', '-57', '9.25', '2026-05-17 08:52:40.596165+09', '2026-05-17 08:52:40.596165+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('186', '001', '217', '61.18', '558.82', '0', '-57', '9', '2026-05-17 08:52:50.597282+09', '2026-05-17 08:52:50.597282+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('187', '001', '218', '61.25', '558.75', '0', '-57', '9.75', '2026-05-17 08:53:00.597608+09', '2026-05-17 08:53:00.597608+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('188', '001', '219', '61.32', '558.68', '0', '-57', '9.5', '2026-05-17 08:53:10.598853+09', '2026-05-17 08:53:10.598853+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('189', '001', '220', '61.56', '558.44', '0', '-59', '9.75', '2026-05-17 08:53:20.597472+09', '2026-05-17 08:53:20.597472+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('190', '001', '1780511730956', '220', '400', '0', NULL, NULL, '2026-06-04 03:35:30.961+09', '2026-06-04 03:35:30.96053+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('191', '001', '1780511740972', '200', '420', '0', NULL, NULL, '2026-06-04 03:35:40.976+09', '2026-06-04 03:35:40.97456+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('192', '001', '1780511760827', '250', '370', '0', NULL, NULL, '2026-06-04 03:36:00.83+09', '2026-06-04 03:36:00.831099+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('193', '001', '1780512610020', '100', '520', '0', NULL, NULL, '2026-06-04 03:50:10.027+09', '2026-06-04 03:50:10.026031+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('194', '001', '1780517444785', '125', '495', '0', NULL, NULL, '2026-06-04 05:10:44.795+09', '2026-06-04 05:10:44.79572+09');
INSERT INTO public.water_level_measurements (id, sensor_id, packet_id, distance_cm, water_level_cm, hop_count, rssi, snr, measured_at, received_at) VALUES ('195', '001', '1780552896421', '380', '240', '0', NULL, NULL, '2026-06-04 15:01:36.423+09', '2026-06-04 15:01:36.421245+09');


--
-- Name: alerts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.alerts_id_seq', 3, true);


--
-- Name: monitoring_stations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.monitoring_stations_id_seq', 8, true);


--
-- Name: settlements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.settlements_id_seq', 5, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 2, true);


--
-- Name: water_bodies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.water_bodies_id_seq', 4, true);


--
-- Name: water_level_measurements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.water_level_measurements_id_seq', 195, true);


--
-- Name: alerts alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_pkey PRIMARY KEY (id);


--
-- Name: monitoring_stations monitoring_stations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monitoring_stations
    ADD CONSTRAINT monitoring_stations_pkey PRIMARY KEY (id);


--
-- Name: monitoring_stations monitoring_stations_station_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monitoring_stations
    ADD CONSTRAINT monitoring_stations_station_code_key UNIQUE (station_code);


--
-- Name: sensors sensors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sensors
    ADD CONSTRAINT sensors_pkey PRIMARY KEY (sensor_id);


--
-- Name: settlements settlements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settlements
    ADD CONSTRAINT settlements_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: water_bodies water_bodies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.water_bodies
    ADD CONSTRAINT water_bodies_pkey PRIMARY KEY (id);


--
-- Name: water_level_measurements water_level_measurements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.water_level_measurements
    ADD CONSTRAINT water_level_measurements_pkey PRIMARY KEY (id);


--
-- Name: idx_alerts_station_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alerts_station_active ON public.alerts USING btree (monitoring_station_id, resolved_at);


--
-- Name: idx_measurements_sensor_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_measurements_sensor_time ON public.water_level_measurements USING btree (sensor_id, measured_at DESC);


--
-- Name: alerts alerts_measurement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_measurement_id_fkey FOREIGN KEY (measurement_id) REFERENCES public.water_level_measurements(id) ON DELETE SET NULL;


--
-- Name: alerts alerts_monitoring_station_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_monitoring_station_id_fkey FOREIGN KEY (monitoring_station_id) REFERENCES public.monitoring_stations(id) ON DELETE CASCADE;


--
-- Name: monitoring_stations monitoring_stations_settlement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monitoring_stations
    ADD CONSTRAINT monitoring_stations_settlement_id_fkey FOREIGN KEY (settlement_id) REFERENCES public.settlements(id);


--
-- Name: monitoring_stations monitoring_stations_water_body_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monitoring_stations
    ADD CONSTRAINT monitoring_stations_water_body_id_fkey FOREIGN KEY (water_body_id) REFERENCES public.water_bodies(id);


--
-- Name: sensors sensors_monitoring_station_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sensors
    ADD CONSTRAINT sensors_monitoring_station_id_fkey FOREIGN KEY (monitoring_station_id) REFERENCES public.monitoring_stations(id);


--
-- PostgreSQL database dump complete
--

