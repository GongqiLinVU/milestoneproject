import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
test('fresh schema reaches the same shared-library columns, policies and guards',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;create table auth.users(id uuid primary key,email text,raw_app_meta_data jsonb default '{}');create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;grant usage on schema public,auth to anon,authenticated,service_role;insert into auth.users values('10000000-0000-0000-0000-000000000001','owner@example.invalid','{"role":"teacher"}');`);
 try{await db.exec(fs.readFileSync('supabase/schema.sql','utf8').replace('create extension if not exists pgcrypto;',''));}catch(e){throw Error(e.message+' at SQL position '+e.position);}
 const cols=(await db.query("select column_name from information_schema.columns where table_schema='public' and table_name='projects'")).rows.map(r=>r.column_name);assert.ok(!cols.includes('block_id'));assert.ok(cols.includes('legacy_block_id'));assert.ok(cols.includes('created_by'));
 assert.ok((await db.query("select 1 from pg_policies where tablename='projects' and policyname='project_library_read'")).rows.length);
 assert.ok((await db.query("select 1 from pg_trigger where tgname='guard_project_assignment'")).rows.length);
 await db.exec(fs.readFileSync('supabase/migrations/20261101_sprint11_shared_project_library.sql','utf8'));
 }finally{await db.close();}
});
