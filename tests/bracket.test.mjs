import test from 'node:test';
import assert from 'node:assert/strict';
import {bracketSeeds,leagueFixtures,stageName,groupAssignments,groupName,groupStandings,qualifierSeeding} from '../lib/bracket.ts';

test('every bracket size from two to 128 reaches one final without losing a team on a bye',()=>{
  for(let count=2;count<=128;count++){
    const teams=Array.from({length:count},(_,i)=>`team-${i}`);
    const nodes=bracketSeeds(teams);
    const entrants=nodes.filter(n=>n.round===1).flatMap(n=>[n.homeId,n.awayId]).filter(Boolean);
    assert.deepEqual(new Set(entrants),new Set(teams));
    const lastRound=Math.max(...nodes.map(n=>n.round));
    assert.equal(nodes.filter(n=>n.round===lastRound).length,1);
    for(let round=1;round<=lastRound;round++)for(const node of nodes.filter(n=>n.round===round)){
      if(!node.winnerId){
        assert.ok(node.homeId&&node.awayId,`missing side for ${count} teams, round ${round}`);
        node.winnerId=node.homeId;
        const parent=nodes.find(n=>n.round===round+1&&n.slot===Math.floor(node.slot/2));
        if(parent){if(node.slot%2)parent.awayId=node.winnerId;else parent.homeId=node.winnerId}
      }
    }
    assert.ok(nodes.at(-1).winnerId,`missing champion for ${count} teams`);
  }
});

test('league schedules each pairing exactly once across distinct rounds',()=>{
  for(const count of [2,3,4,5,6,16,32]){
    const teams=Array.from({length:count},(_,i)=>`team-${i}`);
    const games=leagueFixtures(teams);
    assert.equal(games.length,count*(count-1)/2);
    assert.equal(new Set(games.map(x=>[x.homeId,x.awayId].sort().join('|'))).size,games.length);
    for(const round of new Set(games.map(x=>x.round))){
      const sides=games.filter(x=>x.round===round).flatMap(x=>[x.homeId,x.awayId]);
      assert.equal(new Set(sides).size,sides.length);
    }
  }
  assert.equal(stageName(2,3),'Semifinal');
  assert.equal(stageName(3,3),'Final');
});

test('groups remain balanced and every team plays once per round',()=>{
  for(let count=4;count<=128;count++){
    const teams=Array.from({length:count},(_,i)=>`team-${i}`);
    const groups=groupAssignments(teams);
    assert.deepEqual(new Set(groups.flat()),new Set(teams));
    assert.ok(groups.every(group=>group.length>=2&&group.length<=4));
    assert.ok(Math.max(...groups.map(x=>x.length))-Math.min(...groups.map(x=>x.length))<=1);
    for(const group of groups){
      const games=leagueFixtures(group);
      assert.equal(games.length,group.length*(group.length-1)/2);
      for(const round of new Set(games.map(x=>x.round))){
        const sides=games.filter(x=>x.round===round).flatMap(x=>[x.homeId,x.awayId]);
        assert.equal(new Set(sides).size,sides.length);
      }
    }
  }
  assert.equal(groupName(0),'Grupo A');
  assert.equal(groupName(25),'Grupo Z');
  assert.equal(groupName(26),'Grupo AA');
});

test('the top two in each group qualify and can progress through elimination',()=>{
  for(const count of [4,5,8,9,12,16,32,128]){
    const groups=groupAssignments(Array.from({length:count},(_,i)=>`team-${i}`));
    const qualifiers=groups.map((members,i)=>{
      const games=leagueFixtures(members).map(({homeId,awayId})=>({homeId,awayId,homeGoals:homeId===members[0]?3:1,awayGoals:0,status:'final'}));
      const table=groupStandings(members,games);
      assert.equal(table.reduce((total,row)=>total+row.points,0),games.length*3);
      assert.equal(table.reduce((total,row)=>total+row.gf,0),table.reduce((total,row)=>total+row.ga,0));
      return {id:String(i),first:table[0].id,second:table[1].id};
    });
    const seeded=qualifierSeeding(qualifiers);
    assert.equal(new Set(seeded).size,groups.length*2);
    const bracket=bracketSeeds(seeded);
    const last=Math.max(...bracket.map(x=>x.round));
    assert.equal(stageName(last,last),'Final');
    assert.equal(bracket.filter(x=>x.round===last).length,1);
    const owner=new Map(qualifiers.flatMap(group=>[[group.first,group.id],[group.second,group.id]]));
    if(groups.length>1)assert.equal(bracket.filter(x=>x.round===1&&x.homeId&&x.awayId&&owner.get(x.homeId)===owner.get(x.awayId)).length,0);
  }
});

test('group ranking uses three points for wins, one for draws and goal difference',()=>{
  const games=[
    {homeId:'A',awayId:'B',homeGoals:2,awayGoals:2,status:'final'},
    {homeId:'A',awayId:'C',homeGoals:3,awayGoals:0,status:'final'},
    {homeId:'B',awayId:'C',homeGoals:1,awayGoals:0,status:'final'},
  ];
  const rows=groupStandings(['A','B','C'],games);
  assert.deepEqual(rows.map(x=>[x.id,x.points,x.gf,x.ga,x.gd]),[['A',4,5,2,3],['B',4,3,2,1],['C',0,0,4,-4]]);
});
