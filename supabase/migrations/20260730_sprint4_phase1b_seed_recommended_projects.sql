-- Sprint 4 Phase 1b: seed the recommended NIT3004 project catalogue
--
-- Run after 20260730_sprint4_phase1_team_project_foundation.sql.
-- This script publishes the six teacher-recommended projects for 2026 · 2B1.
-- It does not create or replace any Team → Project assignment.
--
-- Safe to run more than once: an existing project with the same block and
-- title is preserved so later teacher edits are not overwritten.

do $$
declare
  v_block_id uuid;
begin
  select id
    into v_block_id
  from public.teaching_blocks
  where academic_year = 2026
    and upper(trim(block_code)) = '2B1'
  order by created_at desc
  limit 1;

  if v_block_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'Teaching block 2026 · 2B1 was not found';
  end if;

  insert into public.projects (
    block_id,
    title,
    problem,
    target_users,
    description,
    expected_outcomes,
    category,
    difficulty,
    status,
    source
  )
  values
    (
      v_block_id,
      'AI Wardrobe Assistant',
      'People often struggle to organise growing wardrobes and choose suitable outfits for changing weather, seasons and occasions.',
      'People who want practical wardrobe organisation and personalised outfit guidance.',
      'Develop an AI-powered wardrobe management platform that classifies clothing, organises wardrobes and recommends outfits based on weather, season, occasion and user preferences.',
      'Deliver authentication, clothing upload and management, AI classification and tagging, weather-aware recommendations, favourites and wardrobe analytics. Explain the classification workflow, recommendation method, data model, architecture and decision logic. Evaluate classification accuracy and recommendation quality.',
      'AI',
      'Standard',
      'published',
      'teacher'
    ),
    (
      v_block_id,
      'AI Nutrition Assistant',
      'People need an easier way to understand meal nutrition, track personal goals and make healthier food choices.',
      'People who want image-assisted meal tracking and personalised nutrition guidance.',
      'Develop an AI-powered nutrition platform that analyses meals from images, estimates nutrition, tracks goals and recommends healthier meals.',
      'Deliver meal image recognition, nutrition data, goal and history tracking, a dashboard, recommendations and progress tracking. Explain the recognition workflow, nutrition calculations, recommendation algorithm and validation approach. Evaluate recognition and recommendation accuracy.',
      'AI',
      'Advanced',
      'published',
      'teacher'
    ),
    (
      v_block_id,
      'AI Meeting Assistant',
      'Meeting transcripts are time-consuming to review, and important decisions, actions and ownership can be lost after a meeting.',
      'Teams and professionals who need reliable summaries, action tracking and follow-up.',
      'Develop an AI-powered meeting assistant that transforms transcripts into summaries, action items and collaborative workflows.',
      'Deliver OAuth login, meeting and transcript management, AI summaries, action extraction, task tracking, notifications and a dashboard. Explain transcript processing, prompt engineering, AI validation and security architecture. Evaluate summary and action-extraction quality.',
      'AI',
      'Standard',
      'published',
      'teacher'
    ),
    (
      v_block_id,
      'Environmental Decision Support Platform',
      'Environmental sensor data can be noisy and difficult to translate into timely, explainable forecasts and operational decisions.',
      'Environmental analysts, researchers and operational teams working with sensor data.',
      'Develop an environmental monitoring platform for analysing sensor data, forecasting conditions and generating explainable AI insights.',
      'Deliver sensor ingestion, cleaning, dashboards, wind analysis, forecasting, AI summaries, PDF reports and data-quality monitoring. Explain the cleaning method, forecasting model, explainability and data pipeline. Evaluate prediction accuracy and limitations.',
      'Data',
      'Advanced',
      'published',
      'teacher'
    ),
    (
      v_block_id,
      'Phishing Detection Platform',
      'Users and organisations need earlier, more understandable detection of suspicious email while controlling false-positive alerts.',
      'Email users, security analysts and organisations managing phishing risk.',
      'Develop an AI-assisted phishing detection platform using machine learning and explainable AI.',
      'Deliver email upload, feature extraction, ML prediction, explainability, a threat dashboard, risk reports and user management. Explain dataset preparation, feature engineering, model selection and explainability. Evaluate precision, recall and false positives.',
      'Cybersecurity',
      'Advanced',
      'published',
      'teacher'
    ),
    (
      v_block_id,
      'Smart Infrastructure Analytics',
      'Operational datasets are often fragmented or underused, limiting an organisation''s ability to identify trends, predict issues and take informed action.',
      'Infrastructure operators, asset managers and operational decision-makers.',
      'Develop a decision-support platform that analyses operational datasets and generates actionable insights.',
      'Deliver data ingestion and cleaning, dashboards, trend analysis, predictive analytics, recommendations and report generation. Explain the analytical method, prediction model and recommendation logic. Evaluate prediction performance and the practical usefulness of the insights.',
      'Data',
      'Advanced',
      'published',
      'teacher'
    )
  on conflict (block_id, title) do nothing;
end
$$;

-- Verification: expect six rows after first run (or more if the teacher already
-- created other projects for this block).
select
  project.title,
  project.category,
  project.difficulty,
  project.status,
  project.source
from public.projects project
join public.teaching_blocks block on block.id = project.block_id
where block.academic_year = 2026
  and upper(trim(block.block_code)) = '2B1'
  and project.title in (
    'AI Wardrobe Assistant',
    'AI Nutrition Assistant',
    'AI Meeting Assistant',
    'Environmental Decision Support Platform',
    'Phishing Detection Platform',
    'Smart Infrastructure Analytics'
  )
order by project.title;
