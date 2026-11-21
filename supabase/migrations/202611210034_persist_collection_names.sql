-- Persist the renamed TANJ collections and descriptions in both CMS draft and production.
-- Safe to run again: revision changes only when one of these records still differs.
BEGIN;

WITH transformed AS (
  SELECT
    id,
    jsonb_set(
      jsonb_set(
        draft,
        '{collections}',
        (
          SELECT jsonb_agg(
            CASE x->>'id'
              WHEN 'base-0' THEN x || jsonb_build_object(
                'name','TANJ Lira',
                'description','Dress panjang dengan siluet mengalir dan belt yang dapat disesuaikan di pinggang. Dikenakan longgar atau dengan belt, keduanya memberi tampilan yang anggun dan nyaman.'
              )
              WHEN 'base-1' THEN x || jsonb_build_object(
                'name','TANJ Runa',
                'description','Outer dengan potongan ringan dan tepian bergelombang yang memberi bentuk khas saat dikenakan. Mudah dipadukan dengan busana dalam untuk tampilan yang effortless dan tertata.'
              )
              WHEN 'base-3' THEN x || jsonb_build_object(
                'name','TANJ Sera',
                'description','Outer panjang dengan siluet bersih dan detail bordir pada kedua ujung lengan. Dirancang untuk melengkapi tampilan sehari-hari maupun momen yang lebih istimewa, tanpa terasa berlebihan.'
              )
              ELSE x
            END ORDER BY ordinality
          )
          FROM jsonb_array_elements(draft->'collections') WITH ORDINALITY AS e(x, ordinality)
        )
      ),
      '{products}',
      (
        SELECT jsonb_agg(
          CASE x->>'collectionId'
            WHEN 'base-0' THEN x || jsonb_build_object('description','Dress panjang dengan siluet mengalir dan belt yang dapat disesuaikan di pinggang. Dikenakan longgar atau dengan belt, keduanya memberi tampilan yang anggun dan nyaman.')
            WHEN 'base-1' THEN x || jsonb_build_object('description','Outer dengan potongan ringan dan tepian bergelombang yang memberi bentuk khas saat dikenakan. Mudah dipadukan dengan busana dalam untuk tampilan yang effortless dan tertata.')
            WHEN 'base-3' THEN x || jsonb_build_object('description','Outer panjang dengan siluet bersih dan detail bordir pada kedua ujung lengan. Dirancang untuk melengkapi tampilan sehari-hari maupun momen yang lebih istimewa, tanpa terasa berlebihan.')
            ELSE x
          END ORDER BY ordinality
        )
        FROM jsonb_array_elements(draft->'products') WITH ORDINALITY AS e(x, ordinality)
      )
    ) AS next_draft,
    jsonb_set(
      jsonb_set(
        published,
        '{collections}',
        (
          SELECT jsonb_agg(
            CASE x->>'id'
              WHEN 'base-0' THEN x || jsonb_build_object('name','TANJ Lira','description','Dress panjang dengan siluet mengalir dan belt yang dapat disesuaikan di pinggang. Dikenakan longgar atau dengan belt, keduanya memberi tampilan yang anggun dan nyaman.')
              WHEN 'base-1' THEN x || jsonb_build_object('name','TANJ Runa','description','Outer dengan potongan ringan dan tepian bergelombang yang memberi bentuk khas saat dikenakan. Mudah dipadukan dengan busana dalam untuk tampilan yang effortless dan tertata.')
              WHEN 'base-3' THEN x || jsonb_build_object('name','TANJ Sera','description','Outer panjang dengan siluet bersih dan detail bordir pada kedua ujung lengan. Dirancang untuk melengkapi tampilan sehari-hari maupun momen yang lebih istimewa, tanpa terasa berlebihan.')
              ELSE x
            END ORDER BY ordinality
          )
          FROM jsonb_array_elements(published->'collections') WITH ORDINALITY AS e(x, ordinality)
        )
      ),
      '{products}',
      (
        SELECT jsonb_agg(
          CASE x->>'collectionId'
            WHEN 'base-0' THEN x || jsonb_build_object('description','Dress panjang dengan siluet mengalir dan belt yang dapat disesuaikan di pinggang. Dikenakan longgar atau dengan belt, keduanya memberi tampilan yang anggun dan nyaman.')
            WHEN 'base-1' THEN x || jsonb_build_object('description','Outer dengan potongan ringan dan tepian bergelombang yang memberi bentuk khas saat dikenakan. Mudah dipadukan dengan busana dalam untuk tampilan yang effortless dan tertata.')
            WHEN 'base-3' THEN x || jsonb_build_object('description','Outer panjang dengan siluet bersih dan detail bordir pada kedua ujung lengan. Dirancang untuk melengkapi tampilan sehari-hari maupun momen yang lebih istimewa, tanpa terasa berlebihan.')
            ELSE x
          END ORDER BY ordinality
        )
        FROM jsonb_array_elements(published->'products') WITH ORDINALITY AS e(x, ordinality)
      )
    ) AS next_published
  FROM public.tb_m_cms
  WHERE id
)
UPDATE public.tb_m_cms AS cms
SET draft = transformed.next_draft,
    published = transformed.next_published,
    revision = cms.revision + 1
FROM transformed
WHERE cms.id = transformed.id
  AND (cms.draft IS DISTINCT FROM transformed.next_draft
       OR cms.published IS DISTINCT FROM transformed.next_published);

COMMIT;
