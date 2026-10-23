import {useEffect,useState} from 'react';
import type {Session,SupabaseClient} from '@supabase/supabase-js';
export type StaffSession={email:string;isTeacher:boolean;isSuperadmin:boolean;mustChangePassword:boolean};

// Auth emits SIGNED_IN again on returning to a tab, even for the same account.
// Only identity transitions may replace the workspace with the loading screen.
export function useStaffSession(client:SupabaseClient){
 const [sessionUser,setSessionUser]=useState<StaffSession|null>(null);
 const [authChecking,setAuthChecking]=useState(true);
 const [authMessage,setAuthMessage]=useState('');
 useEffect(()=>{
  let active=true,generation=0,resolvedUserId:string|null=null,requestedUserId:string|null=null;
  const schedule=(session:Session|null)=>{
   const seq=++generation,id=session?.user.id||null;
   const changed=id!==requestedUserId;requestedUserId=id;
   if(!id||!session?.user.email){resolvedUserId=null;setSessionUser(null);setAuthChecking(false);return;}
   if(changed||resolvedUserId!==id){setSessionUser(null);setAuthChecking(true);}
   // Defer RPC outside Supabase's auth callback lock.
   setTimeout(async()=>{
    if(!active||seq!==generation)return;
    try{
     const {data,error}=await client.rpc('get_staff_context');
     if(!active||seq!==generation)return;
     if(error){
      setAuthMessage('Class access could not be checked. Please retry if an action fails.');
      // A transient background failure must not destroy an open form. RLS/API
      // authorization still checks every operation. Initial failures stay closed.
      if(resolvedUserId!==id)setSessionUser({email:session.user.email!,isTeacher:false,isSuperadmin:false,mustChangePassword:false});
     }else{
      const next={email:session.user.email!,isTeacher:data?.isTeacher===true,isSuperadmin:data?.isSuperadmin===true,mustChangePassword:data?.mustChangePassword===true};
      setSessionUser(previous=>previous&&Object.keys(next).every(key=>previous[key as keyof StaffSession]===next[key as keyof StaffSession])?previous:next);
      resolvedUserId=id;
     }
    }catch{
     if(!active||seq!==generation)return;
     setAuthMessage('Class access could not be checked. Please retry if an action fails.');
    }
    if(active&&seq===generation)setAuthChecking(false);
   },0);
  };
  const initialGeneration=generation;
  void client.auth.getSession().then(({data:{session}})=>{if(active&&generation===initialGeneration)schedule(session);}).catch(()=>{if(active&&generation===initialGeneration){setAuthChecking(false);setAuthMessage('Your session could not be restored. Sign in again.');}});
  const {data:{subscription}}=client.auth.onAuthStateChange((_event,session)=>{if(active)schedule(session);});
  return()=>{active=false;++generation;subscription.unsubscribe();};
 },[client]);
 return {sessionUser,setSessionUser,authChecking,authMessage,setAuthMessage};
}
