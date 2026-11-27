-- Preserve registros legados sem truncar capacidades ou alterar viagens.
-- O teto é exigido em novas linhas e quando a capacidade é alterada.
CREATE FUNCTION enforce_vehicle_capacity_limit() RETURNS TRIGGER AS $$
BEGIN
  IF NEW."capacity" > 60 THEN
    IF TG_OP = 'UPDATE' THEN
      IF NEW."capacity" = OLD."capacity" THEN
        RETURN NEW;
      END IF;
    END IF;
    RAISE EXCEPTION 'A capacidade deve ser de no máximo 60 passageiros'
      USING ERRCODE = '23514', CONSTRAINT = 'vehicles_capacity_maximum';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vehicles_capacity_limit
BEFORE INSERT OR UPDATE OF "capacity" ON "vehicles"
FOR EACH ROW EXECUTE FUNCTION enforce_vehicle_capacity_limit();
