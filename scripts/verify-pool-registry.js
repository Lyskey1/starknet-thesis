/* One-shot onchain verification of the STRK20 privacy pool's asset universe.
   Enumerates distinct `token` event keys across Deposit, OpenNoteDeposited,
   OpenNoteCreated (and Withdrawal as a cross-check), resolves symbols, and
   diffs against the backend's pool-summary.perToken list. */
const POOL = '0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a';
const RPC = 'https://api.cartridge.gg/x/starknet/mainnet';
const BACKEND = 'https://strk20-dashboard-production.up.railway.app';

/* ---- keccak-256 (pure JS, BigInt lanes) ---- */
const RC = [
  0x0000000000000001n,0x0000000000008082n,0x800000000000808An,0x8000000080008000n,
  0x000000000000808Bn,0x0000000080000001n,0x8000000080008081n,0x8000000000008009n,
  0x000000000000008An,0x0000000000000088n,0x0000000080008009n,0x000000008000000An,
  0x000000008000808Bn,0x800000000000008Bn,0x8000000000008089n,0x8000000000008003n,
  0x8000000000008002n,0x8000000000000080n,0x000000000000800An,0x800000008000000An,
  0x8000000080008081n,0x8000000000008080n,0x0000000080000001n,0x8000000080008008n];
const R = [0,1,62,28,27,36,44,6,55,20,3,10,43,25,39,41,45,15,21,8,18,2,61,56,14];
const M64 = (1n<<64n)-1n;
const rot = (v,n)=>((v<<BigInt(n))|(v>>BigInt(64-n)))&M64;
function keccakF(s){
  for(let rnd=0;rnd<24;rnd++){
    const C=[],D=[];
    for(let x=0;x<5;x++)C[x]=s[x]^s[x+5]^s[x+10]^s[x+15]^s[x+20];
    for(let x=0;x<5;x++)D[x]=C[(x+4)%5]^rot(C[(x+1)%5],1);
    for(let i=0;i<25;i++)s[i]^=D[i%5];
    const B=new Array(25);
    for(let x=0;x<5;x++)for(let y=0;y<5;y++)B[y+((2*x+3*y)%5)*5]=rot(s[x+5*y],R[x+5*y]);
    for(let x=0;x<5;x++)for(let y=0;y<5;y++)s[x+5*y]=B[x+5*y]^((~B[(x+1)%5+5*y]&M64)&B[(x+2)%5+5*y]);
    s[0]^=RC[rnd];
  }
}
function keccak256(bytes){
  const s=new Array(25).fill(0n), rate=136;
  const padded=[...bytes]; padded.push(0x01);
  while(padded.length%rate!==0)padded.push(0);
  padded[padded.length-1]|=0x80;
  for(let off=0;off<padded.length;off+=rate){
    for(let i=0;i<rate/8;i++){
      let lane=0n;
      for(let b=7;b>=0;b--)lane=(lane<<8n)|BigInt(padded[off+i*8+b]);
      s[i]^=lane;
    }
    keccakF(s);
  }
  let out=0n; // digest = lanes 0..3, each emitted little-endian, read as one BE value
  for(let i=0;i<4;i++){
    const lane=s[i];
    for(let b=0;b<8;b++)out=(out<<8n)|((lane>>BigInt(8*b))&0xffn);
  }
  return out;
}
const snKeccak = name => keccak256([...Buffer.from(name,'utf8')]) & ((1n<<250n)-1n);
const hex = v => '0x'+v.toString(16);
// sanity: known selector for 'transfer'
const t = snKeccak('transfer');
if(hex(t)!=='0x83afd3f4caedc6eebf44246fe54e38c95e3179a5ec9ea81740eca5b482d12e')
  throw new Error('keccak self-test failed: '+hex(t));

async function rpc(method,params,tries=5){
  for(let i=0;i<tries;i++){
    try{
      const r=await fetch(RPC,{method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(20000)});
      const j=await r.json();
      if(j.error)throw new Error(JSON.stringify(j.error));
      return j.result;
    }catch(e){if(i===tries-1)throw e;await new Promise(s=>setTimeout(s,1500*(i+1)));}
  }
}
const norm = a => '0x'+BigInt(a).toString(16).padStart(63,'0');

async function scanTokens(eventName, tokenKeyPos){
  const sel=hex(snKeccak(eventName));
  const tokens=new Map(); let token; let pages=0; let count=0;
  let cont;
  do{
    const filter={from_block:{block_number:0},to_block:'latest',address:POOL,keys:[[sel]],chunk_size:1000};
    if(cont)filter.continuation_token=cont;
    const res=await rpc('starknet_getEvents',[filter]);
    res.events.forEach(ev=>{count++;const tk=ev.keys[tokenKeyPos];if(tk)tokens.set(norm(tk),(tokens.get(norm(tk))||0)+1);});
    cont=res.continuation_token; pages++;
    process.stderr.write(`\r${eventName}: page ${pages}, events ${count}, tokens ${tokens.size}   `);
  }while(cont);
  process.stderr.write('\n');
  return {tokens,count};
}

function feltToStr(f){
  let v=BigInt(f),s='';
  while(v>0n){s=String.fromCharCode(Number(v&0xffn))+s;v>>=8n;}
  return s.replace(/[^\x20-\x7e]/g,'?');
}
async function symbolOf(addr){
  for(const name of ['symbol']){
    try{
      const r=await rpc('starknet_call',[{contract_address:addr,entry_point_selector:hex(snKeccak(name)),calldata:[]},'latest']);
      if(r&&r.length===1)return feltToStr(r[0]);          // felt252 symbol
      if(r&&r.length>=2)return feltToStr(r[r.length-2]);  // ByteArray: last full word heuristic
    }catch(e){}
  }
  return '?';
}

(async()=>{
  const dep=await scanTokens('Deposit',2);
  const ond=await scanTokens('OpenNoteDeposited',2);
  const onc=await scanTokens('OpenNoteCreated',1);
  const wdr=await scanTokens('Withdrawal',2);
  const union=new Map();
  [[dep,'Deposit'],[ond,'OpenNoteDeposited'],[onc,'OpenNoteCreated'],[wdr,'Withdrawal']].forEach(([r,tag])=>{
    r.tokens.forEach((n,a)=>{if(!union.has(a))union.set(a,new Set());union.get(a).add(tag);});
  });
  console.log('\nDISTINCT TOKENS ONCHAIN (union):',union.size);
  console.log('via Deposit:',dep.tokens.size,'| OpenNoteDeposited:',ond.tokens.size,'| OpenNoteCreated:',onc.tokens.size,'| Withdrawal:',wdr.tokens.size);

  const s=await fetch(BACKEND+'/agg/pool-summary').then(r=>r.json());
  const backend=new Map((s.perToken||[]).map(t=>[norm(t.address),t.symbol]));
  console.log('backend perToken:',backend.size);

  const rows=[];
  for(const [addr,srcs] of union){
    const sym=backend.get(addr)||await symbolOf(addr);
    rows.push({addr,sym,srcs:[...srcs].join('+'),inBackend:backend.has(addr)});
  }
  rows.sort((a,b)=>a.sym.localeCompare(b.sym));
  rows.forEach(r=>console.log((r.inBackend?'  ':'ONCHAIN-ONLY ')+r.sym.padEnd(10),r.addr,'['+r.srcs+']'));
  const missing=[...backend.entries()].filter(([a])=>!union.has(a));
  missing.forEach(([a,sym])=>console.log('BACKEND-ONLY',sym.padEnd(10),a));
})();
