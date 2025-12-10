--
-- PostgreSQL database dump
--

\restrict id5RV7fV4IgFxQGzgHgmkgN6Axk5fdLyQMqVxNDzdV4akBbu57lL17kqBHccjpg

-- Dumped from database version 17.7 (178558d)
-- Dumped by pg_dump version 17.7 (Homebrew)

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

--
-- Name: topology; Type: SCHEMA; Schema: -; Owner: neondb_owner
--

CREATE SCHEMA topology;


ALTER SCHEMA topology OWNER TO neondb_owner;

--
-- Name: SCHEMA topology; Type: COMMENT; Schema: -; Owner: neondb_owner
--

COMMENT ON SCHEMA topology IS 'PostGIS Topology schema';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: postgis; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;


--
-- Name: EXTENSION postgis; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION postgis IS 'PostGIS geometry and geography spatial types and functions';


--
-- Name: postgis_topology; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis_topology WITH SCHEMA topology;


--
-- Name: EXTENSION postgis_topology; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION postgis_topology IS 'PostGIS topology spatial types and functions';


--
-- Name: collision_severity; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.collision_severity AS ENUM (
    'fatal',
    'serious',
    'slight'
);


ALTER TYPE public.collision_severity OWNER TO neondb_owner;

--
-- Name: crime_category; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.crime_category AS ENUM (
    'violent',
    'theft',
    'burglary',
    'vehicle',
    'damage',
    'drugs',
    'antisocial',
    'fraud',
    'other'
);


ALTER TYPE public.crime_category OWNER TO neondb_owner;

--
-- Name: risk_level; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.risk_level AS ENUM (
    'low',
    'medium',
    'high',
    'very_high'
);


ALTER TYPE public.risk_level OWNER TO neondb_owner;

--
-- Name: transport_mode; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.transport_mode AS ENUM (
    'walking',
    'cycling',
    'driving',
    'public_transport'
);


ALTER TYPE public.transport_mode OWNER TO neondb_owner;

--
-- Name: get_nearby_hazards(double precision, double precision, integer, integer); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.get_nearby_hazards(user_lat double precision, user_lng double precision, radius_meters integer DEFAULT 5000, max_results integer DEFAULT 50) RETURNS TABLE(id integer, hazard_type character varying, severity character varying, description text, latitude double precision, longitude double precision, address character varying, distance_meters double precision, reported_at timestamp without time zone, verification_count integer, verified boolean, status character varying)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.id,
    h.hazard_type,
    h.severity,
    h.description,
    h.latitude,
    h.longitude,
    h.address,
    ST_Distance(
      h.location,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) AS distance_meters,
    h.reported_at,
    h.verification_count,
    h.verified,
    h.status
  FROM hazards h
  WHERE h.status = 'active'
    AND ST_DWithin(
      h.location,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      radius_meters
    )
  ORDER BY distance_meters ASC
  LIMIT max_results;
END;
$$;


ALTER FUNCTION public.get_nearby_hazards(user_lat double precision, user_lng double precision, radius_meters integer, max_results integer) OWNER TO neondb_owner;

--
-- Name: FUNCTION get_nearby_hazards(user_lat double precision, user_lng double precision, radius_meters integer, max_results integer); Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON FUNCTION public.get_nearby_hazards(user_lat double precision, user_lng double precision, radius_meters integer, max_results integer) IS 'Returns hazards within specified radius using PostGIS spatial queries';


--
-- Name: update_user_updated_at(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.update_user_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_user_updated_at() OWNER TO neondb_owner;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: hazards; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.hazards (
    id integer NOT NULL,
    user_id integer,
    hazard_type character varying(100) NOT NULL,
    severity character varying(50) NOT NULL,
    description text,
    location public.geography(Point,4326) NOT NULL,
    latitude double precision,
    longitude double precision,
    address character varying(500),
    verified boolean DEFAULT false,
    verification_count integer DEFAULT 0,
    status character varying(50) DEFAULT 'active'::character varying,
    reported_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    resolved_at timestamp without time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    priority_level character varying(20) DEFAULT 'normal'::character varying,
    affects_traffic boolean DEFAULT false,
    weather_related boolean DEFAULT false,
    image_url text,
    CONSTRAINT hazards_severity_check CHECK (((severity)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'critical'::character varying])::text[]))),
    CONSTRAINT hazards_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'resolved'::character varying, 'archived'::character varying])::text[])))
);


ALTER TABLE public.hazards OWNER TO neondb_owner;

--
-- Name: TABLE hazards; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.hazards IS 'Hazard reporting table. Real-time updates now handled via WebSocket (Socket.IO) instead of PostgreSQL triggers.';


--
-- Name: active_hazards_summary; Type: VIEW; Schema: public; Owner: neondb_owner
--

CREATE VIEW public.active_hazards_summary AS
 SELECT hazard_type,
    severity,
    count(*) AS count,
    avg(verification_count) AS avg_verifications
   FROM public.hazards
  WHERE ((status)::text = 'active'::text)
  GROUP BY hazard_type, severity
  ORDER BY severity DESC, (count(*)) DESC;


ALTER VIEW public.active_hazards_summary OWNER TO neondb_owner;

--
-- Name: buddy_blocks; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.buddy_blocks (
    id integer NOT NULL,
    blocker_id integer NOT NULL,
    blocked_id integer NOT NULL,
    reason character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT buddy_blocks_check CHECK ((blocker_id <> blocked_id))
);


ALTER TABLE public.buddy_blocks OWNER TO neondb_owner;

--
-- Name: TABLE buddy_blocks; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.buddy_blocks IS 'Privacy controls to block unwanted interactions';


--
-- Name: buddy_blocks_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.buddy_blocks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.buddy_blocks_id_seq OWNER TO neondb_owner;

--
-- Name: buddy_blocks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.buddy_blocks_id_seq OWNED BY public.buddy_blocks.id;


--
-- Name: buddy_connections; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.buddy_connections (
    id integer NOT NULL,
    user_id_1 integer NOT NULL,
    user_id_2 integer NOT NULL,
    connected_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_ride_together timestamp without time zone,
    total_rides_together integer DEFAULT 0,
    is_favorite boolean DEFAULT false,
    CONSTRAINT buddy_connections_check CHECK ((user_id_1 < user_id_2))
);


ALTER TABLE public.buddy_connections OWNER TO neondb_owner;

--
-- Name: TABLE buddy_connections; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.buddy_connections IS 'Established buddy relationships and ride history';


--
-- Name: buddy_connections_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.buddy_connections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.buddy_connections_id_seq OWNER TO neondb_owner;

--
-- Name: buddy_connections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.buddy_connections_id_seq OWNED BY public.buddy_connections.id;


--
-- Name: buddy_profiles; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.buddy_profiles (
    id integer NOT NULL,
    user_id integer NOT NULL,
    display_name character varying(100) NOT NULL,
    avatar_url character varying(500),
    bio text,
    preferred_activities character varying(255)[],
    safety_rating numeric(3,2) DEFAULT 0.00,
    total_rides integer DEFAULT 0,
    completed_rides integer DEFAULT 0,
    is_verified boolean DEFAULT false,
    verification_date timestamp without time zone,
    gender character varying(20),
    age_range character varying(20),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.buddy_profiles OWNER TO neondb_owner;

--
-- Name: TABLE buddy_profiles; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.buddy_profiles IS 'Extended user profiles for buddy matching with safety ratings';


--
-- Name: COLUMN buddy_profiles.safety_rating; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.buddy_profiles.safety_rating IS 'Auto-calculated average from buddy_ratings';


--
-- Name: buddy_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.buddy_profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.buddy_profiles_id_seq OWNER TO neondb_owner;

--
-- Name: buddy_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.buddy_profiles_id_seq OWNED BY public.buddy_profiles.id;


--
-- Name: buddy_ratings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.buddy_ratings (
    id integer NOT NULL,
    rater_id integer NOT NULL,
    rated_user_id integer NOT NULL,
    request_id integer,
    rating integer NOT NULL,
    comment text,
    categories jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT buddy_ratings_check CHECK ((rater_id <> rated_user_id)),
    CONSTRAINT buddy_ratings_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.buddy_ratings OWNER TO neondb_owner;

--
-- Name: TABLE buddy_ratings; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.buddy_ratings IS 'User ratings and feedback for completed rides';


--
-- Name: buddy_ratings_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.buddy_ratings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.buddy_ratings_id_seq OWNER TO neondb_owner;

--
-- Name: buddy_ratings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.buddy_ratings_id_seq OWNED BY public.buddy_ratings.id;


--
-- Name: buddy_requests; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.buddy_requests (
    id integer NOT NULL,
    requester_id integer NOT NULL,
    recipient_id integer NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    message text,
    route_from_lat numeric(10,7),
    route_from_lon numeric(10,7),
    route_to_lat numeric(10,7),
    route_to_lon numeric(10,7),
    route_from_name character varying(500),
    route_to_name character varying(500),
    activity_type character varying(50),
    proposed_time timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    responded_at timestamp without time zone,
    expires_at timestamp without time zone DEFAULT (CURRENT_TIMESTAMP + '24:00:00'::interval),
    CONSTRAINT buddy_requests_check CHECK ((requester_id <> recipient_id)),
    CONSTRAINT buddy_requests_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('accepted'::character varying)::text, ('declined'::character varying)::text, ('cancelled'::character varying)::text, ('expired'::character varying)::text])))
);


ALTER TABLE public.buddy_requests OWNER TO neondb_owner;

--
-- Name: TABLE buddy_requests; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.buddy_requests IS 'Invitation system for buddy ride requests';


--
-- Name: COLUMN buddy_requests.expires_at; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.buddy_requests.expires_at IS 'Requests auto-expire after 24 hours';


--
-- Name: buddy_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.buddy_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.buddy_requests_id_seq OWNER TO neondb_owner;

--
-- Name: buddy_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.buddy_requests_id_seq OWNED BY public.buddy_requests.id;


--
-- Name: collisions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.collisions (
    collision_id integer NOT NULL,
    external_id character varying(50),
    location public.geography(Point,4326) NOT NULL,
    collision_date date NOT NULL,
    collision_time time without time zone,
    severity public.collision_severity NOT NULL,
    casualty_count integer DEFAULT 1,
    vehicle_count integer DEFAULT 1,
    vehicle_types text[],
    weather_conditions character varying(50),
    road_surface character varying(50),
    lighting_conditions character varying(50),
    speed_limit integer,
    junction_detail character varying(100),
    data_source character varying(50) DEFAULT 'transport_uk'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT collisions_casualty_count_check CHECK ((casualty_count >= 0)),
    CONSTRAINT collisions_vehicle_count_check CHECK ((vehicle_count >= 0))
);


ALTER TABLE public.collisions OWNER TO neondb_owner;

--
-- Name: collision_hotspots; Type: VIEW; Schema: public; Owner: neondb_owner
--

CREATE VIEW public.collision_hotspots AS
 SELECT public.st_x(public.st_snaptogrid((location)::public.geometry, (0.001)::double precision)) AS longitude,
    public.st_y(public.st_snaptogrid((location)::public.geometry, (0.001)::double precision)) AS latitude,
    count(*) AS collision_count,
    count(*) FILTER (WHERE (severity = 'serious'::public.collision_severity)) AS serious_count,
    count(*) FILTER (WHERE (severity = 'fatal'::public.collision_severity)) AS fatal_count,
    sum(casualty_count) AS total_casualties
   FROM public.collisions
  WHERE (collision_date >= (CURRENT_DATE - '2 years'::interval))
  GROUP BY (public.st_snaptogrid((location)::public.geometry, (0.001)::double precision))
 HAVING (count(*) >= 3)
  ORDER BY (count(*)) DESC;


ALTER VIEW public.collision_hotspots OWNER TO neondb_owner;

--
-- Name: collisions_collision_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.collisions_collision_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.collisions_collision_id_seq OWNER TO neondb_owner;

--
-- Name: collisions_collision_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.collisions_collision_id_seq OWNED BY public.collisions.collision_id;


--
-- Name: crime_data; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.crime_data (
    crime_id integer NOT NULL,
    external_id character varying(50),
    crime_type public.crime_category NOT NULL,
    location public.geography(Point,4326) NOT NULL,
    reported_date date NOT NULL,
    month_year character varying(7) NOT NULL,
    street_name character varying(200),
    area_name character varying(100),
    severity_score integer DEFAULT 1,
    outcome_status character varying(100),
    data_source character varying(50) DEFAULT 'police_uk'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT crime_data_severity_score_check CHECK (((severity_score >= 1) AND (severity_score <= 5)))
);


ALTER TABLE public.crime_data OWNER TO neondb_owner;

--
-- Name: crime_data_cache; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.crime_data_cache (
    id integer NOT NULL,
    area_hash character varying(64),
    crime_rate numeric(3,2) DEFAULT 0.3,
    incident_count integer DEFAULT 0,
    last_updated timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    data_source character varying(50) DEFAULT 'mock'::character varying
);


ALTER TABLE public.crime_data_cache OWNER TO neondb_owner;

--
-- Name: crime_data_cache_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.crime_data_cache_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.crime_data_cache_id_seq OWNER TO neondb_owner;

--
-- Name: crime_data_cache_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.crime_data_cache_id_seq OWNED BY public.crime_data_cache.id;


--
-- Name: crime_data_crime_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.crime_data_crime_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.crime_data_crime_id_seq OWNER TO neondb_owner;

--
-- Name: crime_data_crime_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.crime_data_crime_id_seq OWNED BY public.crime_data.crime_id;


--
-- Name: crime_density_grid; Type: MATERIALIZED VIEW; Schema: public; Owner: neondb_owner
--

CREATE MATERIALIZED VIEW public.crime_density_grid AS
 SELECT public.st_snaptogrid((location)::public.geometry, (0.001)::double precision) AS grid_cell,
    count(*) AS crime_count,
    count(*) FILTER (WHERE (crime_type = 'violent'::public.crime_category)) AS violent_count,
    count(*) FILTER (WHERE (crime_type = 'theft'::public.crime_category)) AS theft_count,
    avg(severity_score) AS avg_severity,
    max(reported_date) AS latest_incident
   FROM public.crime_data
  WHERE (reported_date >= (CURRENT_DATE - '1 year'::interval))
  GROUP BY (public.st_snaptogrid((location)::public.geometry, (0.001)::double precision))
  WITH NO DATA;


ALTER MATERIALIZED VIEW public.crime_density_grid OWNER TO neondb_owner;

--
-- Name: events_data_cache; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.events_data_cache (
    id integer NOT NULL,
    area_hash character varying(64),
    event_type character varying(100),
    event_impact numeric(3,2) DEFAULT 0.0,
    last_updated timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    event_start timestamp without time zone,
    event_end timestamp without time zone,
    data_source character varying(50) DEFAULT 'mock'::character varying
);


ALTER TABLE public.events_data_cache OWNER TO neondb_owner;

--
-- Name: events_data_cache_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.events_data_cache_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.events_data_cache_id_seq OWNER TO neondb_owner;

--
-- Name: events_data_cache_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.events_data_cache_id_seq OWNED BY public.events_data_cache.id;


--
-- Name: hazard_verifications; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.hazard_verifications (
    id integer NOT NULL,
    hazard_id integer NOT NULL,
    user_id integer NOT NULL,
    verified_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.hazard_verifications OWNER TO neondb_owner;

--
-- Name: hazard_verifications_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.hazard_verifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.hazard_verifications_id_seq OWNER TO neondb_owner;

--
-- Name: hazard_verifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.hazard_verifications_id_seq OWNED BY public.hazard_verifications.id;


--
-- Name: hazards_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.hazards_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.hazards_id_seq OWNER TO neondb_owner;

--
-- Name: hazards_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.hazards_id_seq OWNED BY public.hazards.id;


--
-- Name: high_risk_areas; Type: VIEW; Schema: public; Owner: neondb_owner
--

CREATE VIEW public.high_risk_areas AS
 WITH crime_risk AS (
         SELECT public.st_snaptogrid((crime_data.location)::public.geometry, (0.001)::double precision) AS grid_location,
            count(*) AS crime_count,
            avg(crime_data.severity_score) AS avg_crime_severity
           FROM public.crime_data
          WHERE (crime_data.reported_date >= (CURRENT_DATE - '1 year'::interval))
          GROUP BY (public.st_snaptogrid((crime_data.location)::public.geometry, (0.001)::double precision))
        ), collision_risk AS (
         SELECT public.st_snaptogrid((collisions.location)::public.geometry, (0.001)::double precision) AS grid_location,
            count(*) AS collision_count,
            sum(collisions.casualty_count) AS total_casualties
           FROM public.collisions
          WHERE (collisions.collision_date >= (CURRENT_DATE - '2 years'::interval))
          GROUP BY (public.st_snaptogrid((collisions.location)::public.geometry, (0.001)::double precision))
        )
 SELECT public.st_setsrid(cr.grid_location, 4326) AS location,
    public.st_x(cr.grid_location) AS longitude,
    public.st_y(cr.grid_location) AS latitude,
    COALESCE(cr.crime_count, (0)::bigint) AS crime_incidents,
    COALESCE(cr.avg_crime_severity, (0)::numeric) AS avg_crime_severity,
    COALESCE(col.collision_count, (0)::bigint) AS collision_incidents,
    COALESCE(col.total_casualties, (0)::bigint) AS total_casualties,
    ((((COALESCE(cr.crime_count, (0)::bigint))::numeric * COALESCE(cr.avg_crime_severity, (1)::numeric)) + ((COALESCE(col.collision_count, (0)::bigint) * 2))::numeric) + (COALESCE(col.total_casualties, (0)::bigint))::numeric) AS composite_risk_score
   FROM (crime_risk cr
     FULL JOIN collision_risk col ON ((cr.grid_location OPERATOR(public.=) col.grid_location)))
  WHERE ((COALESCE(cr.crime_count, (0)::bigint) >= 5) OR (COALESCE(col.collision_count, (0)::bigint) >= 2))
  ORDER BY ((((COALESCE(cr.crime_count, (0)::bigint))::numeric * COALESCE(cr.avg_crime_severity, (1)::numeric)) + ((COALESCE(col.collision_count, (0)::bigint) * 2))::numeric) + (COALESCE(col.total_casualties, (0)::bigint))::numeric) DESC;


ALTER VIEW public.high_risk_areas OWNER TO neondb_owner;

--
-- Name: location_sharing; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.location_sharing (
    id integer NOT NULL,
    user_id integer NOT NULL,
    location public.geography(Point,4326) NOT NULL,
    accuracy numeric(10,2),
    heading numeric(5,2),
    speed numeric(10,2),
    is_sharing boolean DEFAULT true,
    sharing_radius integer DEFAULT 5000,
    current_activity character varying(50),
    available_until timestamp without time zone,
    last_updated timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.location_sharing OWNER TO neondb_owner;

--
-- Name: TABLE location_sharing; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.location_sharing IS 'Real-time location tracking for users sharing their position';


--
-- Name: COLUMN location_sharing.location; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.location_sharing.location IS 'PostGIS GEOGRAPHY point for accurate distance calculations';


--
-- Name: COLUMN location_sharing.sharing_radius; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.location_sharing.sharing_radius IS 'Discovery radius in meters (user preference)';


--
-- Name: location_sharing_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.location_sharing_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.location_sharing_id_seq OWNER TO neondb_owner;

--
-- Name: location_sharing_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.location_sharing_id_seq OWNED BY public.location_sharing.id;


--
-- Name: ml_model_predictions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.ml_model_predictions (
    prediction_id integer NOT NULL,
    route_geometry public.geography(LineString,4326) NOT NULL,
    model_version character varying(50) NOT NULL,
    predicted_safety_score numeric(3,2),
    feature_vector jsonb,
    confidence_score numeric(3,2),
    actual_safety_score numeric(3,2),
    prediction_timestamp timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ml_model_predictions_actual_safety_score_check CHECK (((actual_safety_score >= (0)::numeric) AND (actual_safety_score <= (1)::numeric))),
    CONSTRAINT ml_model_predictions_confidence_score_check CHECK (((confidence_score >= (0)::numeric) AND (confidence_score <= (1)::numeric))),
    CONSTRAINT ml_model_predictions_predicted_safety_score_check CHECK (((predicted_safety_score >= (0)::numeric) AND (predicted_safety_score <= (1)::numeric)))
);


ALTER TABLE public.ml_model_predictions OWNER TO neondb_owner;

--
-- Name: ml_model_predictions_prediction_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.ml_model_predictions_prediction_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ml_model_predictions_prediction_id_seq OWNER TO neondb_owner;

--
-- Name: ml_model_predictions_prediction_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.ml_model_predictions_prediction_id_seq OWNED BY public.ml_model_predictions.prediction_id;


--
-- Name: ml_training_data; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.ml_training_data (
    id integer NOT NULL,
    route_features jsonb NOT NULL,
    user_feedback_score numeric(3,2) NOT NULL,
    safety_outcome integer,
    model_version character varying(20),
    training_set_id character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.ml_training_data OWNER TO neondb_owner;

--
-- Name: ml_training_data_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.ml_training_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ml_training_data_id_seq OWNER TO neondb_owner;

--
-- Name: ml_training_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.ml_training_data_id_seq OWNED BY public.ml_training_data.id;


--
-- Name: poi_safety_data; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.poi_safety_data (
    poi_id integer NOT NULL,
    location public.geography(Point,4326) NOT NULL,
    poi_type character varying(100) NOT NULL,
    name character varying(200),
    description text,
    operating_hours character varying(100),
    safety_impact_positive boolean DEFAULT true,
    influence_radius integer DEFAULT 50,
    data_source character varying(50),
    verified boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.poi_safety_data OWNER TO neondb_owner;

--
-- Name: poi_safety_data_poi_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.poi_safety_data_poi_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.poi_safety_data_poi_id_seq OWNER TO neondb_owner;

--
-- Name: poi_safety_data_poi_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.poi_safety_data_poi_id_seq OWNED BY public.poi_safety_data.poi_id;


--
-- Name: real_time_hazards; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.real_time_hazards (
    id integer NOT NULL,
    area_hash character varying(64),
    hazard_type character varying(100),
    severity numeric(3,2) DEFAULT 0.3,
    latitude numeric(10,8),
    longitude numeric(11,8),
    description text,
    reported_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_updated timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    location character varying(255),
    status character varying(50) DEFAULT 'active'::character varying,
    resolved_at timestamp without time zone,
    radius_meters integer DEFAULT 100,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.real_time_hazards OWNER TO neondb_owner;

--
-- Name: real_time_hazards_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.real_time_hazards_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.real_time_hazards_id_seq OWNER TO neondb_owner;

--
-- Name: real_time_hazards_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.real_time_hazards_id_seq OWNED BY public.real_time_hazards.id;


--
-- Name: recent_crime_summary; Type: VIEW; Schema: public; Owner: neondb_owner
--

CREATE VIEW public.recent_crime_summary AS
 SELECT crime_type,
    public.st_x(public.st_snaptogrid((location)::public.geometry, (0.001)::double precision)) AS longitude,
    public.st_y(public.st_snaptogrid((location)::public.geometry, (0.001)::double precision)) AS latitude,
    count(*) AS incident_count,
    avg(severity_score) AS avg_severity,
    date_trunc('month'::text, (reported_date)::timestamp with time zone) AS month
   FROM public.crime_data
  WHERE (reported_date >= (CURRENT_DATE - '1 year'::interval))
  GROUP BY crime_type, (public.st_snaptogrid((location)::public.geometry, (0.001)::double precision)), (date_trunc('month'::text, (reported_date)::timestamp with time zone));


ALTER VIEW public.recent_crime_summary OWNER TO neondb_owner;

--
-- Name: road_segments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.road_segments (
    segment_id integer NOT NULL,
    geometry public.geography(LineString,4326) NOT NULL,
    road_name character varying(200),
    road_type character varying(50),
    surface_type character varying(50),
    width_meters numeric(5,2),
    lighting_quality numeric(3,2),
    pedestrian_facilities boolean DEFAULT false,
    cycle_facilities boolean DEFAULT false,
    speed_limit integer,
    safety_score numeric(3,2),
    risk_level public.risk_level,
    last_assessed date,
    data_source character varying(50) DEFAULT 'osm'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT road_segments_lighting_quality_check CHECK (((lighting_quality >= (0)::numeric) AND (lighting_quality <= (1)::numeric))),
    CONSTRAINT road_segments_safety_score_check CHECK (((safety_score >= (0)::numeric) AND (safety_score <= (1)::numeric)))
);


ALTER TABLE public.road_segments OWNER TO neondb_owner;

--
-- Name: road_segments_segment_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.road_segments_segment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.road_segments_segment_id_seq OWNER TO neondb_owner;

--
-- Name: road_segments_segment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.road_segments_segment_id_seq OWNED BY public.road_segments.segment_id;


--
-- Name: route_analytics_cache; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.route_analytics_cache (
    id integer NOT NULL,
    route_hash character varying(64) NOT NULL,
    analytics_data jsonb NOT NULL,
    ml_model_version character varying(20),
    cache_expiry timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.route_analytics_cache OWNER TO neondb_owner;

--
-- Name: route_analytics_cache_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.route_analytics_cache_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.route_analytics_cache_id_seq OWNER TO neondb_owner;

--
-- Name: route_analytics_cache_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.route_analytics_cache_id_seq OWNED BY public.route_analytics_cache.id;


--
-- Name: route_history; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.route_history (
    id integer NOT NULL,
    user_id integer,
    route_id integer,
    start_latitude double precision NOT NULL,
    start_longitude double precision NOT NULL,
    end_latitude double precision NOT NULL,
    end_longitude double precision NOT NULL,
    distance_km double precision,
    estimated_time_minutes integer,
    actual_time_minutes integer,
    transport_mode text DEFAULT 'walking'::text,
    safety_rating integer,
    user_notes text,
    completed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT route_history_safety_rating_check CHECK (((safety_rating >= 1) AND (safety_rating <= 5)))
);


ALTER TABLE public.route_history OWNER TO neondb_owner;

--
-- Name: route_history_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.route_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.route_history_id_seq OWNER TO neondb_owner;

--
-- Name: route_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.route_history_id_seq OWNED BY public.route_history.id;


--
-- Name: routes; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.routes (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    difficulty text DEFAULT 'medium'::text,
    distance_km double precision,
    estimated_time_minutes integer,
    safety_rating integer,
    start_latitude double precision,
    start_longitude double precision,
    end_latitude double precision,
    end_longitude double precision,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    path public.geometry(LineString,4326),
    CONSTRAINT routes_safety_rating_check CHECK (((safety_rating >= 1) AND (safety_rating <= 5)))
);


ALTER TABLE public.routes OWNER TO neondb_owner;

--
-- Name: routes_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.routes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.routes_id_seq OWNER TO neondb_owner;

--
-- Name: routes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.routes_id_seq OWNED BY public.routes.id;


--
-- Name: safety_factors; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.safety_factors (
    id integer NOT NULL,
    area_hash character varying(64),
    crime_rate numeric(3,2) DEFAULT 0.3,
    lighting_factor numeric(3,2) DEFAULT 0.5,
    foot_traffic numeric(3,2) DEFAULT 0.5,
    police_presence numeric(3,2) DEFAULT 0.3,
    last_updated timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    location character varying(255),
    factor_type character varying(100),
    severity numeric(3,2) DEFAULT 0.5,
    confidence numeric(3,2) DEFAULT 0.5,
    data_source character varying(50) DEFAULT 'system'::character varying
);


ALTER TABLE public.safety_factors OWNER TO neondb_owner;

--
-- Name: safety_factors_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.safety_factors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.safety_factors_id_seq OWNER TO neondb_owner;

--
-- Name: safety_factors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.safety_factors_id_seq OWNED BY public.safety_factors.id;


--
-- Name: safety_incidents; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.safety_incidents (
    incident_id integer NOT NULL,
    location public.geography(Point,4326) NOT NULL,
    incident_type character varying(100) NOT NULL,
    severity public.risk_level NOT NULL,
    description text,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone,
    affects_transport_modes public.transport_mode[],
    radius_meters integer DEFAULT 100,
    data_source character varying(50),
    verified boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    latitude numeric(10,8),
    longitude numeric(11,8),
    incident_time timestamp without time zone,
    resolution_time timestamp without time zone,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.safety_incidents OWNER TO neondb_owner;

--
-- Name: safety_incidents_incident_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.safety_incidents_incident_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.safety_incidents_incident_id_seq OWNER TO neondb_owner;

--
-- Name: safety_incidents_incident_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.safety_incidents_incident_id_seq OWNED BY public.safety_incidents.incident_id;


--
-- Name: traffic_data_cache; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.traffic_data_cache (
    id integer NOT NULL,
    area_hash character varying(64),
    traffic_density numeric(3,2) DEFAULT 0.5,
    last_updated timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    data_source character varying(50) DEFAULT 'mock'::character varying
);


ALTER TABLE public.traffic_data_cache OWNER TO neondb_owner;

--
-- Name: traffic_data_cache_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.traffic_data_cache_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.traffic_data_cache_id_seq OWNER TO neondb_owner;

--
-- Name: traffic_data_cache_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.traffic_data_cache_id_seq OWNED BY public.traffic_data_cache.id;


--
-- Name: user_behavior_profiles; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.user_behavior_profiles (
    id integer NOT NULL,
    user_id integer,
    profile_data jsonb NOT NULL,
    last_updated timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_analyzed timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_behavior_profiles OWNER TO neondb_owner;

--
-- Name: user_behavior_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.user_behavior_profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_behavior_profiles_id_seq OWNER TO neondb_owner;

--
-- Name: user_behavior_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.user_behavior_profiles_id_seq OWNED BY public.user_behavior_profiles.id;


--
-- Name: user_preferences; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.user_preferences (
    id integer NOT NULL,
    user_id integer,
    safety_priority numeric(3,2) DEFAULT 0.6,
    speed_priority numeric(3,2) DEFAULT 0.4,
    preferred_transport_mode character varying(20) DEFAULT 'walking'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    preferred_route_type character varying(20) DEFAULT 'balanced'::character varying,
    avoid_high_traffic boolean DEFAULT true,
    avoid_low_lighting boolean DEFAULT true,
    preferred_time_ranges jsonb,
    accessibility_needs jsonb,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_preferences OWNER TO neondb_owner;

--
-- Name: user_preferences_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.user_preferences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_preferences_id_seq OWNER TO neondb_owner;

--
-- Name: user_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.user_preferences_id_seq OWNED BY public.user_preferences.id;


--
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.user_profiles (
    user_id integer NOT NULL,
    external_user_id character varying(100) NOT NULL,
    preferred_transport_mode public.transport_mode DEFAULT 'walking'::public.transport_mode,
    safety_preference numeric(3,2) DEFAULT 0.7,
    avoid_night_travel boolean DEFAULT false,
    mobility_restrictions text[],
    preferred_route_types text[],
    risk_tolerance public.risk_level DEFAULT 'medium'::public.risk_level,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_profiles_safety_preference_check CHECK (((safety_preference >= (0)::numeric) AND (safety_preference <= (1)::numeric)))
);


ALTER TABLE public.user_profiles OWNER TO neondb_owner;

--
-- Name: user_profiles_user_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.user_profiles_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_profiles_user_id_seq OWNER TO neondb_owner;

--
-- Name: user_profiles_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.user_profiles_user_id_seq OWNED BY public.user_profiles.user_id;


--
-- Name: user_route_history; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.user_route_history (
    id integer NOT NULL,
    user_id integer,
    route_type character varying(50),
    start_lat numeric(10,8),
    start_lng numeric(11,8),
    end_lat numeric(10,8),
    end_lng numeric(11,8),
    safety_rating integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    distance numeric(10,2),
    duration integer,
    user_feedback text,
    route_features jsonb,
    ml_prediction_score numeric(3,2),
    actual_safety_outcome integer,
    weather_conditions jsonb,
    time_of_day character varying(20),
    transport_mode character varying(20),
    completed_successfully boolean DEFAULT true,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_route_history OWNER TO neondb_owner;

--
-- Name: user_route_history_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.user_route_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_route_history_id_seq OWNER TO neondb_owner;

--
-- Name: user_route_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.user_route_history_id_seq OWNED BY public.user_route_history.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.users (
    user_id integer NOT NULL,
    username text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    phone text,
    address text,
    emergency_contact text,
    preferred_transport text DEFAULT 'walking'::text,
    safety_priority text DEFAULT 'high'::text,
    notifications boolean DEFAULT true,
    latitude double precision,
    longitude double precision,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    crime_weight integer DEFAULT 40,
    lighting_weight integer DEFAULT 25,
    traffic_weight integer DEFAULT 15,
    population_weight integer DEFAULT 10,
    police_weight integer DEFAULT 10,
    preferences jsonb DEFAULT '{}'::jsonb,
    location_sharing_enabled boolean DEFAULT false,
    discoverable boolean DEFAULT true,
    share_location_default_radius integer DEFAULT 5000,
    crime_severity_weights jsonb DEFAULT '{"Drugs": 0.7, "Robbery": 0.9, "Burglary": 0.8, "Other crime": 0.5, "Other theft": 0.5, "Shoplifting": 0.3, "Public order": 0.5, "Bicycle theft": 0.4, "Vehicle crime": 0.6, "Anti-social behaviour": 0.3, "Possession of weapons": 0.9, "Theft from the person": 0.7, "Criminal damage and arson": 0.6, "Violence and sexual offences": 1.0}'::jsonb,
    safety_factor_weights jsonb DEFAULT '{"crime": 0.4, "hazard": 0.15, "lighting": 0.2, "collision": 0.25}'::jsonb,
    is_verified boolean DEFAULT false,
    verification_token character varying(255),
    token_expiration timestamp without time zone,
    CONSTRAINT check_crime_weight CHECK (((crime_weight >= 0) AND (crime_weight <= 100))),
    CONSTRAINT check_lighting_weight CHECK (((lighting_weight >= 0) AND (lighting_weight <= 100))),
    CONSTRAINT check_police_weight CHECK (((police_weight >= 0) AND (police_weight <= 100))),
    CONSTRAINT check_population_weight CHECK (((population_weight >= 0) AND (population_weight <= 100))),
    CONSTRAINT check_traffic_weight CHECK (((traffic_weight >= 0) AND (traffic_weight <= 100)))
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.users IS 'User profiles with customizable safety scoring weights. Total safety score is calculated dynamically on frontend.';


--
-- Name: COLUMN users.safety_priority; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.users.safety_priority IS 'User preference for route safety vs speed (0=fastest, 1=safest)';


--
-- Name: COLUMN users.crime_severity_weights; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.users.crime_severity_weights IS 'User-specific weighting of crime types for route safety calculation';


--
-- Name: COLUMN users.safety_factor_weights; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.users.safety_factor_weights IS 'User-specific weighting of safety factors (crime, collision, lighting, hazard)';


--
-- Name: COLUMN users.is_verified; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.users.is_verified IS 'Whether the user has verified their email address';


--
-- Name: COLUMN users.verification_token; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.users.verification_token IS 'Unique token sent via email for verification';


--
-- Name: COLUMN users.token_expiration; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.users.token_expiration IS 'Expiration timestamp for the verification token';


--
-- Name: user_safety_profiles; Type: VIEW; Schema: public; Owner: neondb_owner
--

CREATE VIEW public.user_safety_profiles AS
 SELECT user_id,
    username,
    email,
    safety_priority,
    crime_severity_weights,
    safety_factor_weights,
    created_at,
    updated_at
   FROM public.users;


ALTER VIEW public.user_safety_profiles OWNER TO neondb_owner;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO neondb_owner;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.user_id;


--
-- Name: buddy_blocks id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.buddy_blocks ALTER COLUMN id SET DEFAULT nextval('public.buddy_blocks_id_seq'::regclass);


--
-- Name: buddy_connections id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.buddy_connections ALTER COLUMN id SET DEFAULT nextval('public.buddy_connections_id_seq'::regclass);


--
-- Name: buddy_profiles id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.buddy_profiles ALTER COLUMN id SET DEFAULT nextval('public.buddy_profiles_id_seq'::regclass);


--
-- Name: buddy_ratings id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.buddy_ratings ALTER COLUMN id SET DEFAULT nextval('public.buddy_ratings_id_seq'::regclass);


--
-- Name: buddy_requests id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.buddy_requests ALTER COLUMN id SET DEFAULT nextval('public.buddy_requests_id_seq'::regclass);


--
-- Name: collisions collision_id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.collisions ALTER COLUMN collision_id SET DEFAULT nextval('public.collisions_collision_id_seq'::regclass);


--
-- Name: crime_data crime_id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.crime_data ALTER COLUMN crime_id SET DEFAULT nextval('public.crime_data_crime_id_seq'::regclass);


--
-- Name: crime_data_cache id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.crime_data_cache ALTER COLUMN id SET DEFAULT nextval('public.crime_data_cache_id_seq'::regclass);


--
-- Name: events_data_cache id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.events_data_cache ALTER COLUMN id SET DEFAULT nextval('public.events_data_cache_id_seq'::regclass);


--
-- Name: hazard_verifications id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.hazard_verifications ALTER COLUMN id SET DEFAULT nextval('public.hazard_verifications_id_seq'::regclass);


--
-- Name: hazards id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.hazards ALTER COLUMN id SET DEFAULT nextval('public.hazards_id_seq'::regclass);


--
-- Name: location_sharing id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.location_sharing ALTER COLUMN id SET DEFAULT nextval('public.location_sharing_id_seq'::regclass);


--
-- Name: ml_model_predictions prediction_id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ml_model_predictions ALTER COLUMN prediction_id SET DEFAULT nextval('public.ml_model_predictions_prediction_id_seq'::regclass);


--
-- Name: ml_training_data id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ml_training_data ALTER COLUMN id SET DEFAULT nextval('public.ml_training_data_id_seq'::regclass);


--
-- Name: poi_safety_data poi_id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.poi_safety_data ALTER COLUMN poi_id SET DEFAULT nextval('public.poi_safety_data_poi_id_seq'::regclass);


--
-- Name: real_time_hazards id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.real_time_hazards ALTER COLUMN id SET DEFAULT nextval('public.real_time_hazards_id_seq'::regclass);


--
-- Name: road_segments segment_id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.road_segments ALTER COLUMN segment_id SET DEFAULT nextval('public.road_segments_segment_id_seq'::regclass);


--
-- Name: route_analytics_cache id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.route_analytics_cache ALTER COLUMN id SET DEFAULT nextval('public.route_analytics_cache_id_seq'::regclass);


--
-- Name: route_history id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.route_history ALTER COLUMN id SET DEFAULT nextval('public.route_history_id_seq'::regclass);


--
-- Name: routes id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.routes ALTER COLUMN id SET DEFAULT nextval('public.routes_id_seq'::regclass);


--
-- Name: safety_factors id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.safety_factors ALTER COLUMN id SET DEFAULT nextval('public.safety_factors_id_seq'::regclass);


--
-- Name: safety_incidents incident_id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.safety_incidents ALTER COLUMN incident_id SET DEFAULT nextval('public.safety_incidents_incident_id_seq'::regclass);


--
-- Name: traffic_data_cache id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.traffic_data_cache ALTER COLUMN id SET DEFAULT nextval('public.traffic_data_cache_id_seq'::regclass);


--
-- Name: user_behavior_profiles id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_behavior_profiles ALTER COLUMN id SET DEFAULT nextval('public.user_behavior_profiles_id_seq'::regclass);


--
-- Name: user_preferences id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_preferences ALTER COLUMN id SET DEFAULT nextval('public.user_preferences_id_seq'::regclass);


--
-- Name: user_profiles user_id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_profiles ALTER COLUMN user_id SET DEFAULT nextval('public.user_profiles_user_id_seq'::regclass);


--
-- Name: user_route_history id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_route_history ALTER COLUMN id SET DEFAULT nextval('public.user_route_history_id_seq'::regclass);


--
-- Name: users user_id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users ALTER COLUMN user_id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: buddy_blocks buddy_blocks_blocker_id_blocked_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.buddy_blocks
    ADD CONSTRAINT buddy_blocks_blocker_id_blocked_id_key UNIQUE (blocker_id, blocked_id);


--
-- Name: buddy_blocks buddy_blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.buddy_blocks
    ADD CONSTRAINT buddy_blocks_pkey PRIMARY KEY (id);


--
-- Name: buddy_connections buddy_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.buddy_connections
    ADD CONSTRAINT buddy_connections_pkey PRIMARY KEY (id);


--
-- Name: buddy_connections buddy_connections_user_id_1_user_id_2_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.buddy_connections
    ADD CONSTRAINT buddy_connections_user_id_1_user_id_2_key UNIQUE (user_id_1, user_id_2);


--
-- Name: buddy_profiles buddy_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.buddy_profiles
    ADD CONSTRAINT buddy_profiles_pkey PRIMARY KEY (id);


--
-- Name: buddy_profiles buddy_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.buddy_profiles
    ADD CONSTRAINT buddy_profiles_user_id_key UNIQUE (user_id);


--
-- Name: buddy_ratings buddy_ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.buddy_ratings
    ADD CONSTRAINT buddy_ratings_pkey PRIMARY KEY (id);


--
-- Name: buddy_ratings buddy_ratings_rater_id_request_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.buddy_ratings
    ADD CONSTRAINT buddy_ratings_rater_id_request_id_key UNIQUE (rater_id, request_id);


--
-- Name: buddy_requests buddy_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.buddy_requests
    ADD CONSTRAINT buddy_requests_pkey PRIMARY KEY (id);


--
-- Name: collisions collisions_external_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.collisions
    ADD CONSTRAINT collisions_external_id_key UNIQUE (external_id);


--
-- Name: collisions collisions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.collisions
    ADD CONSTRAINT collisions_pkey PRIMARY KEY (collision_id);


--
-- Name: crime_data_cache crime_data_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.crime_data_cache
    ADD CONSTRAINT crime_data_cache_pkey PRIMARY KEY (id);


--
-- Name: crime_data crime_data_external_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.crime_data
    ADD CONSTRAINT crime_data_external_id_key UNIQUE (external_id);


--
-- Name: crime_data crime_data_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.crime_data
    ADD CONSTRAINT crime_data_pkey PRIMARY KEY (crime_id);


--
-- Name: events_data_cache events_data_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.events_data_cache
    ADD CONSTRAINT events_data_cache_pkey PRIMARY KEY (id);


--
-- Name: hazard_verifications hazard_verifications_hazard_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.hazard_verifications
    ADD CONSTRAINT hazard_verifications_hazard_id_user_id_key UNIQUE (hazard_id, user_id);


--
-- Name: hazard_verifications hazard_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.hazard_verifications
    ADD CONSTRAINT hazard_verifications_pkey PRIMARY KEY (id);


--
-- Name: hazards hazards_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.hazards
    ADD CONSTRAINT hazards_pkey PRIMARY KEY (id);


--
-- Name: location_sharing location_sharing_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.location_sharing
    ADD CONSTRAINT location_sharing_pkey PRIMARY KEY (id);


--
-- Name: location_sharing location_sharing_user_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.location_sharing
    ADD CONSTRAINT location_sharing_user_id_key UNIQUE (user_id);


--
-- Name: ml_model_predictions ml_model_predictions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ml_model_predictions
    ADD CONSTRAINT ml_model_predictions_pkey PRIMARY KEY (prediction_id);


--
-- Name: ml_training_data ml_training_data_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ml_training_data
    ADD CONSTRAINT ml_training_data_pkey PRIMARY KEY (id);


--
-- Name: poi_safety_data poi_safety_data_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.poi_safety_data
    ADD CONSTRAINT poi_safety_data_pkey PRIMARY KEY (poi_id);


--
-- Name: real_time_hazards real_time_hazards_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.real_time_hazards
    ADD CONSTRAINT real_time_hazards_pkey PRIMARY KEY (id);


--
-- Name: road_segments road_segments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.road_segments
    ADD CONSTRAINT road_segments_pkey PRIMARY KEY (segment_id);


--
-- Name: route_analytics_cache route_analytics_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.route_analytics_cache
    ADD CONSTRAINT route_analytics_cache_pkey PRIMARY KEY (id);


--
-- Name: route_analytics_cache route_analytics_cache_route_hash_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.route_analytics_cache
    ADD CONSTRAINT route_analytics_cache_route_hash_key UNIQUE (route_hash);


--
-- Name: route_history route_history_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.route_history
    ADD CONSTRAINT route_history_pkey PRIMARY KEY (id);


--
-- Name: routes routes_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.routes
    ADD CONSTRAINT routes_pkey PRIMARY KEY (id);


--
-- Name: safety_factors safety_factors_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.safety_factors
    ADD CONSTRAINT safety_factors_pkey PRIMARY KEY (id);


--
-- Name: safety_incidents safety_incidents_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.safety_incidents
    ADD CONSTRAINT safety_incidents_pkey PRIMARY KEY (incident_id);


--
-- Name: traffic_data_cache traffic_data_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.traffic_data_cache
    ADD CONSTRAINT traffic_data_cache_pkey PRIMARY KEY (id);


--
-- Name: user_behavior_profiles user_behavior_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_behavior_profiles
    ADD CONSTRAINT user_behavior_profiles_pkey PRIMARY KEY (id);


--
-- Name: user_preferences user_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_preferences user_preferences_user_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_user_id_key UNIQUE (user_id);


--
-- Name: user_profiles user_profiles_external_user_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_external_user_id_key UNIQUE (external_user_id);


--
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (user_id);


--
-- Name: user_route_history user_route_history_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_route_history
    ADD CONSTRAINT user_route_history_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- Name: idx_buddy_blocks_blocked; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_buddy_blocks_blocked ON public.buddy_blocks USING btree (blocked_id);


--
-- Name: idx_buddy_blocks_blocker; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_buddy_blocks_blocker ON public.buddy_blocks USING btree (blocker_id);


--
-- Name: idx_buddy_connections_favorites; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_buddy_connections_favorites ON public.buddy_connections USING btree (is_favorite) WHERE (is_favorite = true);


--
-- Name: idx_buddy_connections_user1; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_buddy_connections_user1 ON public.buddy_connections USING btree (user_id_1);


--
-- Name: idx_buddy_connections_user2; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_buddy_connections_user2 ON public.buddy_connections USING btree (user_id_2);


--
-- Name: idx_buddy_profiles_activities; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_buddy_profiles_activities ON public.buddy_profiles USING gin (preferred_activities);


--
-- Name: idx_buddy_profiles_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_buddy_profiles_user_id ON public.buddy_profiles USING btree (user_id);


--
-- Name: idx_buddy_profiles_verified; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_buddy_profiles_verified ON public.buddy_profiles USING btree (is_verified);


--
-- Name: idx_buddy_ratings_rated_user; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_buddy_ratings_rated_user ON public.buddy_ratings USING btree (rated_user_id);


--
-- Name: idx_buddy_ratings_request; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_buddy_ratings_request ON public.buddy_ratings USING btree (request_id);


--
-- Name: idx_buddy_requests_expires; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_buddy_requests_expires ON public.buddy_requests USING btree (expires_at) WHERE ((status)::text = 'pending'::text);


--
-- Name: idx_buddy_requests_recipient; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_buddy_requests_recipient ON public.buddy_requests USING btree (recipient_id);


--
-- Name: idx_buddy_requests_requester; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_buddy_requests_requester ON public.buddy_requests USING btree (requester_id);


--
-- Name: idx_buddy_requests_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_buddy_requests_status ON public.buddy_requests USING btree (status);


--
-- Name: idx_collisions_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_collisions_date ON public.collisions USING btree (collision_date);


--
-- Name: idx_collisions_location; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_collisions_location ON public.collisions USING gist (location);


--
-- Name: idx_collisions_location_recent; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_collisions_location_recent ON public.collisions USING gist (location);


--
-- Name: idx_collisions_severity; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_collisions_severity ON public.collisions USING btree (severity);


--
-- Name: idx_crime_data_area; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_crime_data_area ON public.crime_data_cache USING btree (area_hash);


--
-- Name: idx_crime_data_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_crime_data_date ON public.crime_data USING btree (reported_date);


--
-- Name: idx_crime_data_location; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_crime_data_location ON public.crime_data USING gist (location);


--
-- Name: idx_crime_data_location_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_crime_data_location_date ON public.crime_data USING gist (location);


--
-- Name: idx_crime_data_month_year; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_crime_data_month_year ON public.crime_data USING btree (month_year);


--
-- Name: idx_crime_data_type; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_crime_data_type ON public.crime_data USING btree (crime_type);


--
-- Name: idx_crime_density_grid_cell; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX idx_crime_density_grid_cell ON public.crime_density_grid USING btree (grid_cell);


--
-- Name: idx_events_data_area; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_events_data_area ON public.events_data_cache USING btree (area_hash);


--
-- Name: idx_hazard_verifications_hazard; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_hazard_verifications_hazard ON public.hazard_verifications USING btree (hazard_id);


--
-- Name: idx_hazard_verifications_user; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_hazard_verifications_user ON public.hazard_verifications USING btree (user_id);


--
-- Name: idx_hazards_active_recent; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_hazards_active_recent ON public.hazards USING btree (status, reported_at DESC) WHERE ((status)::text = 'active'::text);


--
-- Name: idx_hazards_location; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_hazards_location ON public.hazards USING gist (location);


--
-- Name: idx_hazards_reported_at; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_hazards_reported_at ON public.hazards USING btree (reported_at DESC);


--
-- Name: idx_hazards_severity; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_hazards_severity ON public.hazards USING btree (severity);


--
-- Name: idx_hazards_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_hazards_status ON public.hazards USING btree (status);


--
-- Name: idx_hazards_type; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_hazards_type ON public.hazards USING btree (hazard_type);


--
-- Name: idx_hazards_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_hazards_user_id ON public.hazards USING btree (user_id);


--
-- Name: idx_location_sharing_active; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_location_sharing_active ON public.location_sharing USING btree (is_sharing) WHERE (is_sharing = true);


--
-- Name: idx_location_sharing_location; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_location_sharing_location ON public.location_sharing USING gist (location);


--
-- Name: idx_location_sharing_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_location_sharing_user_id ON public.location_sharing USING btree (user_id);


--
-- Name: idx_ml_predictions_geometry; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_ml_predictions_geometry ON public.ml_model_predictions USING gist (route_geometry);


--
-- Name: idx_ml_predictions_timestamp; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_ml_predictions_timestamp ON public.ml_model_predictions USING btree (prediction_timestamp);


--
-- Name: idx_ml_predictions_version; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_ml_predictions_version ON public.ml_model_predictions USING btree (model_version);


--
-- Name: idx_ml_training_data_model_version; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_ml_training_data_model_version ON public.ml_training_data USING btree (model_version);


--
-- Name: idx_poi_safety_location; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_poi_safety_location ON public.poi_safety_data USING gist (location);


--
-- Name: idx_poi_safety_type; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_poi_safety_type ON public.poi_safety_data USING btree (poi_type);


--
-- Name: idx_real_time_hazards_area; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_real_time_hazards_area ON public.real_time_hazards USING btree (area_hash);


--
-- Name: idx_road_segments_geometry; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_road_segments_geometry ON public.road_segments USING gist (geometry);


--
-- Name: idx_road_segments_safety; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_road_segments_safety ON public.road_segments USING btree (safety_score);


--
-- Name: idx_road_segments_type; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_road_segments_type ON public.road_segments USING btree (road_type);


--
-- Name: idx_route_analytics_cache_expiry; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_route_analytics_cache_expiry ON public.route_analytics_cache USING btree (cache_expiry);


--
-- Name: idx_route_analytics_cache_hash; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_route_analytics_cache_hash ON public.route_analytics_cache USING btree (route_hash);


--
-- Name: idx_safety_factors_area; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_safety_factors_area ON public.safety_factors USING btree (area_hash);


--
-- Name: idx_safety_incidents_active; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_safety_incidents_active ON public.safety_incidents USING btree (start_time, end_time) WHERE (end_time IS NULL);


--
-- Name: idx_safety_incidents_lat; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_safety_incidents_lat ON public.safety_incidents USING btree (latitude);


--
-- Name: idx_safety_incidents_lng; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_safety_incidents_lng ON public.safety_incidents USING btree (longitude);


--
-- Name: idx_safety_incidents_location; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_safety_incidents_location ON public.safety_incidents USING gist (location);


--
-- Name: idx_safety_incidents_time; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_safety_incidents_time ON public.safety_incidents USING btree (start_time, end_time);


--
-- Name: idx_traffic_data_area; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_traffic_data_area ON public.traffic_data_cache USING btree (area_hash);


--
-- Name: idx_user_behavior_profiles_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_behavior_profiles_user_id ON public.user_behavior_profiles USING btree (user_id);


--
-- Name: idx_user_preferences_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_preferences_user_id ON public.user_preferences USING btree (user_id);


--
-- Name: idx_user_route_history_created_at; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_route_history_created_at ON public.user_route_history USING btree (created_at);


--
-- Name: idx_user_route_history_route_type; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_route_history_route_type ON public.user_route_history USING btree (route_type);


--
-- Name: idx_user_route_history_transport_mode; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_route_history_transport_mode ON public.user_route_history USING btree (transport_mode);


--
-- Name: idx_user_route_history_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_user_route_history_user_id ON public.user_route_history USING btree (user_id);


--
-- Name: idx_users_safety_priority; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_users_safety_priority ON public.users USING btree (safety_priority);


--
-- Name: idx_users_safety_weights; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_users_safety_weights ON public.users USING btree (crime_weight, lighting_weight, traffic_weight, population_weight, police_weight);


--
-- Name: idx_users_verification_token; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_users_verification_token ON public.users USING btree (verification_token);


--
-- Name: users users_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER users_updated_at_trigger BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_user_updated_at();


--
-- Name: buddy_blocks buddy_blocks_blocked_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.buddy_blocks
    ADD CONSTRAINT buddy_blocks_blocked_id_fkey FOREIGN KEY (blocked_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: buddy_blocks buddy_blocks_blocker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.buddy_blocks
    ADD CONSTRAINT buddy_blocks_blocker_id_fkey FOREIGN KEY (blocker_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: buddy_connections buddy_connections_user_id_1_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.buddy_connections
    ADD CONSTRAINT buddy_connections_user_id_1_fkey FOREIGN KEY (user_id_1) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: buddy_connections buddy_connections_user_id_2_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.buddy_connections
    ADD CONSTRAINT buddy_connections_user_id_2_fkey FOREIGN KEY (user_id_2) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: buddy_profiles buddy_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.buddy_profiles
    ADD CONSTRAINT buddy_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: buddy_ratings buddy_ratings_rated_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.buddy_ratings
    ADD CONSTRAINT buddy_ratings_rated_user_id_fkey FOREIGN KEY (rated_user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: buddy_ratings buddy_ratings_rater_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.buddy_ratings
    ADD CONSTRAINT buddy_ratings_rater_id_fkey FOREIGN KEY (rater_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: buddy_ratings buddy_ratings_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.buddy_ratings
    ADD CONSTRAINT buddy_ratings_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.buddy_requests(id) ON DELETE SET NULL;


--
-- Name: buddy_requests buddy_requests_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.buddy_requests
    ADD CONSTRAINT buddy_requests_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: buddy_requests buddy_requests_requester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.buddy_requests
    ADD CONSTRAINT buddy_requests_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: hazard_verifications hazard_verifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.hazard_verifications
    ADD CONSTRAINT hazard_verifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: hazards hazards_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.hazards
    ADD CONSTRAINT hazards_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: location_sharing location_sharing_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.location_sharing
    ADD CONSTRAINT location_sharing_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: route_history route_history_route_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.route_history
    ADD CONSTRAINT route_history_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.routes(id) ON DELETE CASCADE;


--
-- Name: route_history route_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.route_history
    ADD CONSTRAINT route_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: user_behavior_profiles user_behavior_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_behavior_profiles
    ADD CONSTRAINT user_behavior_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: user_preferences user_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- Name: user_route_history user_route_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_route_history
    ADD CONSTRAINT user_route_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

\unrestrict id5RV7fV4IgFxQGzgHgmkgN6Axk5fdLyQMqVxNDzdV4akBbu57lL17kqBHccjpg

