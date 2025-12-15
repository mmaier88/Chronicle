-- Migration: Add page_number to match_source_chunks function
-- This enables "jump to source" functionality in Ask-Project

-- Drop and recreate the function with page_number
DROP FUNCTION IF EXISTS match_source_chunks(vector(1024), float, int, uuid);

CREATE OR REPLACE FUNCTION match_source_chunks(
  query_embedding vector(1024),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5,
  p_project_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  content text,
  source_id uuid,
  source_title text,
  page_number int,
  chunk_index int,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sc.id,
    sc.content,
    sc.source_id,
    s.title as source_title,
    sc.page_number,
    sc.chunk_index,
    1 - (sc.embedding <=> query_embedding) as similarity
  FROM source_chunks sc
  JOIN sources s ON s.id = sc.source_id
  WHERE
    (p_project_id IS NULL OR s.project_id = p_project_id)
    AND 1 - (sc.embedding <=> query_embedding) > match_threshold
  ORDER BY sc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION match_source_chunks TO authenticated;
