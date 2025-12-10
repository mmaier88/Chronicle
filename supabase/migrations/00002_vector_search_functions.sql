-- Migration: Vector Search Functions
-- Created: 2025-12-10
-- Description: Add functions for semantic search using pgvector

-- Function to search source chunks by vector similarity
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

-- Function to search document sections by vector similarity
CREATE OR REPLACE FUNCTION match_doc_sections(
  query_embedding vector(1024),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5,
  p_project_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  content text,
  document_id uuid,
  document_title text,
  branch_name text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dse.section_id as id,
    ds.content,
    ds.document_id,
    d.title as document_title,
    db.name as branch_name,
    1 - (dse.embedding <=> query_embedding) as similarity
  FROM doc_section_embeddings dse
  JOIN doc_sections ds ON ds.id = dse.section_id
  JOIN doc_branches db ON db.id = ds.branch_id
  JOIN documents d ON d.id = ds.document_id
  WHERE
    (p_project_id IS NULL OR d.project_id = p_project_id)
    AND 1 - (dse.embedding <=> query_embedding) > match_threshold
  ORDER BY dse.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Combined search function for Ask-Project (searches both sources and documents)
CREATE OR REPLACE FUNCTION ask_project_search(
  query_embedding vector(1024),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10,
  p_project_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  content text,
  source_type text,  -- 'source' or 'document'
  source_id uuid,
  source_title text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  -- Search source chunks
  SELECT
    sc.id,
    sc.content,
    'source'::text as source_type,
    sc.source_id,
    s.title as source_title,
    1 - (sc.embedding <=> query_embedding) as similarity
  FROM source_chunks sc
  JOIN sources s ON s.id = sc.source_id
  WHERE
    (p_project_id IS NULL OR s.project_id = p_project_id)
    AND 1 - (sc.embedding <=> query_embedding) > match_threshold

  UNION ALL

  -- Search document sections
  SELECT
    dse.section_id as id,
    ds.content,
    'document'::text as source_type,
    ds.document_id as source_id,
    d.title as source_title,
    1 - (dse.embedding <=> query_embedding) as similarity
  FROM doc_section_embeddings dse
  JOIN doc_sections ds ON ds.id = dse.section_id
  JOIN documents d ON d.id = ds.document_id
  WHERE
    (p_project_id IS NULL OR d.project_id = p_project_id)
    AND 1 - (dse.embedding <=> query_embedding) > match_threshold

  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION match_source_chunks TO authenticated;
GRANT EXECUTE ON FUNCTION match_doc_sections TO authenticated;
GRANT EXECUTE ON FUNCTION ask_project_search TO authenticated;
