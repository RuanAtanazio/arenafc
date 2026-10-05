export type BracketSeed = {round:number;slot:number;homeId:string|null;awayId:string|null;winnerId:string|null};

// Each expansion preserves the path of a seed through the bracket.
export function seedOrder(size:number):number[]{
  if(size===1)return [1];
  const previous=seedOrder(size/2);
  return previous.flatMap(seed=>[seed,size+1-seed]);
}

export function bracketSeeds(teamIds:string[]):BracketSeed[]{
  if(teamIds.length<2)throw new Error('At least two teams are required');
  const size=2**Math.ceil(Math.log2(teamIds.length));
  const slots=seedOrder(size).map(seed=>teamIds[seed-1]||null);
  const rounds=Math.log2(size);
  const nodes:BracketSeed[]=[];
  for(let round=1;round<=rounds;round++){
    for(let slot=0;slot<size/2**round;slot++){
      const homeId=round===1?slots[slot*2]:null;
      const awayId=round===1?slots[slot*2+1]:null;
      nodes.push({round,slot,homeId,awayId,winnerId:homeId&&!awayId?homeId:awayId&&!homeId?awayId:null});
    }
  }
  // Byes can travel through more than one empty level.
  for(let round=1;round<rounds;round++){
    for(const node of nodes.filter(n=>n.round===round&&n.winnerId)){
      const parent=nodes.find(n=>n.round===round+1&&n.slot===Math.floor(node.slot/2))!;
      if(node.slot%2)parent.awayId=node.winnerId;
      else parent.homeId=node.winnerId;
      if(parent.homeId&&!parent.awayId&&round+1<rounds&&bothBranchesAccounted(nodes,parent))parent.winnerId=parent.homeId;
      if(parent.awayId&&!parent.homeId&&round+1<rounds&&bothBranchesAccounted(nodes,parent))parent.winnerId=parent.awayId;
    }
  }
  return nodes;
}

function bothBranchesAccounted(nodes:BracketSeed[],parent:BracketSeed){
  const children=nodes.filter(n=>n.round===parent.round-1&&Math.floor(n.slot/2)===parent.slot);
  return children.every(n=>n.winnerId||(!n.homeId&&!n.awayId));
}

export function leagueFixtures(teamIds:string[]){
  const ids:(string|null)[]=teamIds.length%2?[...teamIds,null]:[...teamIds];
  const fixtures:{round:number;homeId:string;awayId:string}[]=[];
  for(let round=1;round<ids.length;round++){
    for(let i=0;i<ids.length/2;i++){
      const a=ids[i],b=ids[ids.length-1-i];
      if(a&&b)fixtures.push({round,homeId:round%2||i%2?a:b,awayId:round%2||i%2?b:a});
    }
    ids.splice(1,0,ids.pop()!);
  }
  return fixtures;
}

export function stageName(round:number,totalRounds:number){
  const remaining=totalRounds-round;
  return remaining===0?'Final':remaining===1?'Semifinal':remaining===2?'Quartas de final':remaining===3?'Oitavas de final':`Fase de ${2**(remaining+1)}`;
}

export function groupName(index:number){
  let name='';
  for(let n=index+1;n>0;n=Math.floor((n-1)/26))name=String.fromCharCode(65+(n-1)%26)+name;
  return `Grupo ${name}`;
}

export function groupAssignments(teamIds:string[]){
  if(teamIds.length<4)throw new Error('At least four teams are required');
  const count=Math.ceil(teamIds.length/4);
  const groups:string[][]=Array.from({length:count},()=>[]);
  // Distribute evenly, with at most four teams in any group.
  teamIds.forEach((teamId,index)=>groups[index%count].push(teamId));
  return groups;
}

export type GroupGame={homeId:string;awayId:string;homeGoals:number|null;awayGoals:number|null;status:string};
export function groupStandings(teamIds:string[],games:GroupGame[]){
  const completed=games.filter(x=>x.status==='final');
  const rows=teamIds.map((id,index)=>{
    let played=0,w=0,d=0,l=0,gf=0,ga=0;
    for(const game of completed.filter(x=>x.homeId===id||x.awayId===id)){
      played++;
      const goals=game.homeId===id?game.homeGoals!:game.awayGoals!;
      const against=game.homeId===id?game.awayGoals!:game.homeGoals!;
      gf+=goals;ga+=against;
      if(goals>against)w++;else if(goals===against)d++;else l++;
    }
    return {id,index,played,w,d,l,gf,ga,gd:gf-ga,points:w*3+d};
  });
  const primary=(a:typeof rows[number],b:typeof rows[number])=>b.points-a.points||b.gd-a.gd||b.gf-a.gf||b.w-a.w;
  rows.sort((a,b)=>primary(a,b)||a.index-b.index);
  // Use a mini table for teams still tied on the main criteria.
  for(let start=0;start<rows.length;){
    let end=start+1;
    while(end<rows.length&&primary(rows[start],rows[end])===0)end++;
    if(end-start>1){
      const tied=rows.slice(start,end);
      const ids=new Set(tied.map(x=>x.id));
      const mini=groupStandingsSimple(tied.map(x=>x.id),completed.filter(x=>ids.has(x.homeId)&&ids.has(x.awayId)));
      const order=new Map(mini.map((x,i)=>[x.id,i]));
      rows.splice(start,end-start,...tied.sort((a,b)=>order.get(a.id)!-order.get(b.id)!||a.index-b.index));
    }
    start=end;
  }
  return rows;
}

function groupStandingsSimple(teamIds:string[],games:GroupGame[]){
  return teamIds.map((id,index)=>{
    let points=0,gd=0,gf=0;
    for(const game of games.filter(x=>x.homeId===id||x.awayId===id)){
      const goals=game.homeId===id?game.homeGoals!:game.awayGoals!;
      const against=game.homeId===id?game.awayGoals!:game.homeGoals!;
      points+=goals>against?3:goals===against?1:0;gd+=goals-against;gf+=goals;
    }
    return {id,index,points,gd,gf};
  }).sort((a,b)=>b.points-a.points||b.gd-a.gd||b.gf-a.gf||a.index-b.index);
}

export function qualifierSeeding(groups:{id:string;first:string;second:string}[]){
  const winners=groups.map(x=>({id:x.first,group:x.id}));
  const runners=groups.map(x=>({id:x.second,group:x.id}));
  let best=[...winners,...runners],collisions=Infinity;
  // Rotate runners to avoid same-group meetings in the first elimination round.
  for(let offset=0;offset<runners.length;offset++){
    const candidate=[...winners,...runners.slice(offset),...runners.slice(0,offset)];
    const groupById=new Map(candidate.map(x=>[x.id,x.group]));
    const conflicts=bracketSeeds(candidate.map(x=>x.id)).filter(x=>x.round===1&&x.homeId&&x.awayId&&groupById.get(x.homeId)===groupById.get(x.awayId)).length;
    if(conflicts<collisions){collisions=conflicts;best=candidate}
    if(conflicts===0)break;
  }
  return best.map(x=>x.id);
}
