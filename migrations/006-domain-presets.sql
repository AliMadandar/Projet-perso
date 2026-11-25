CREATE TABLE quote_profiles (
  trade TEXT PRIMARY KEY, data TEXT NOT NULL, version INTEGER NOT NULL
);
-- Reprise uniquement des champs vides de la fiche MA RENOVATION existante.
UPDATE settings SET data=json_set(data,
  '$.address',coalesce(nullif(json_extract(data,'$.address'),''),'621 avenue de Mazargues, 13009 Marseille'),
  '$.phone',coalesce(nullif(json_extract(data,'$.phone'),''),'06 25 75 09 29'),
  '$.email',coalesce(nullif(json_extract(data,'$.email'),''),'madandarali123@gmail.com'),
  '$.identity',coalesce(nullif(json_extract(data,'$.identity'),''),'Madandar Abolfazl · SIRET 79961602400029'))
 ,version=version+1 WHERE id=1 AND json_extract(data,'$.name')='MA RENOVATION';
