// A later selection or local edit invalidates an unfinished file read.
export function createImportController(){
 let revision=0;
 return {
  invalidate(){revision++;},
  async restore(read,parse,confirmReplace,apply){
   const ticket=++revision;
   try{
    const text=await read();
    if(ticket!==revision)return 'stale';
    const state=parse(text);
    if(!confirmReplace())return 'cancelled';
    if(ticket!==revision)return 'stale';
    apply(state);return 'applied';
   }catch(error){if(ticket!==revision)return 'stale';throw error;}
  }
 };
}
export function hasLocalWork(entries,drafts){
 return entries.length>0||[...drafts.values()].some(note=>note.trim().length>0);
}
