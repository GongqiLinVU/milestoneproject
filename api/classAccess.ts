import {createClient} from '@supabase/supabase-js';
export const uuid=(value:unknown):value is string=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export function callerClient(token:string){
 const url=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL;
 const key=process.env.SUPABASE_PUBLISHABLE_KEY||process.env.VITE_SUPABASE_PUBLISHABLE_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw new Error('Account access is not configured');
 return createClient(url,key,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}});
}
export async function hasClassAccess(token:string,classId:string){
 if(!token||!uuid(classId))return false;
 try{const {data,error}=await callerClient(token).rpc('can_manage_teaching_class',{p_class_id:classId});return !error&&data===true;}catch{return false;}
}
