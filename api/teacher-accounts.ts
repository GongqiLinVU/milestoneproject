import {createClient} from '@supabase/supabase-js';
import {randomBytes} from 'node:crypto';
import {callerClient,uuid} from './classAccess.js';
export default async function handler(req:any,res:any){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed.'});
 if(Buffer.byteLength(JSON.stringify(req.body||{}),'utf8')>16000)return res.status(413).json({error:'Request is too large.'});
 const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
 if(!token)return res.status(403).json({error:'Sign in first.'});
 const url=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return res.status(503).json({error:'Teacher account management is not configured.'});
 const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error}=await admin.auth.getUser(token);
 if(error||!user)return res.status(403).json({error:'Your session has expired. Sign in again.'});
 const caller=callerClient(token),{data:context,error:contextError}=await caller.rpc('get_staff_context');
 if(contextError)return res.status(403).json({error:'Staff access could not be verified.'});
 if(req.body?.action==='activate'){
  const password=req.body?.password;
  if(user.app_metadata?.role!=='teacher'||!context?.mustChangePassword)return res.status(403).json({error:'A teacher password change is not required for this account.'});
  if(typeof password!=='string'||password.length<12||password.length>128)return res.status(400).json({error:'Choose a password of 12–128 characters.'});
  const {data:profile}=await admin.from('teacher_profiles').select('active').eq('user_id',user.id).maybeSingle();
  if(!profile?.active)return res.status(403).json({error:'This teacher account is inactive.'});
  const changed=await admin.auth.admin.updateUserById(user.id,{password});
  if(changed.error)return res.status(500).json({error:'Password could not be changed.'});
  const activated=await admin.from('teacher_profiles').update({must_change_password:false}).eq('user_id',user.id);
  if(activated.error)return res.status(500).json({error:'Password changed, but activation is incomplete. Sign in with the new password and retry.'});
  return res.status(200).json({activated:true});
 }
 if(!context?.isSuperadmin)return res.status(403).json({error:'Administrator access required.'});
 if(req.body?.action!=='create')return res.status(400).json({error:'Unsupported action.'});
 const name=String(req.body.name||'').trim(),email=String(req.body.email||'').trim().toLowerCase(),classIds=req.body.classIds;
 if(name.length<1||name.length>100||email.length>160||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!Array.isArray(classIds)||classIds.length>30||!classIds.every(uuid))return res.status(400).json({error:'Enter a name, valid email and class assignments.'});
 const initialPassword=`Vu!${randomBytes(18).toString('base64url')}9a`;
 const created=await admin.auth.admin.createUser({email,password:initialPassword,email_confirm:true,app_metadata:{role:'teacher'}});
 if(created.error||!created.data.user)return res.status(409).json({error:'Teacher could not be created. If the email already exists, use the existing account; no password was overwritten.'});
 const id=created.data.user.id;
 const registered=await caller.rpc('set_teacher_classes',{p_user_id:id,p_class_ids:classIds,p_display_name:name,p_active:true});
 if(registered.error){const cleanup=await admin.auth.admin.deleteUser(id);return res.status(500).json({error:cleanup.error?'Teacher setup failed; an unassigned account remains. Contact the administrator.':'Teacher setup failed. No teacher account was retained.'});}
 return res.status(200).json({userId:id,email,initialPassword});
}
