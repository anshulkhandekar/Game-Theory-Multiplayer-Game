import test from 'node:test';
import assert from 'node:assert/strict';
import {tableStatus,renderPokerResults} from '../src/poker-table-ui.js';
test('Poker decision headline identifies the opponent action from either first seat',()=>{
 const t={players:['a','b'],first:1,actions:['check','bet'],turn:'b',status:'playing'};
 assert.equal(tableStatus(t,'b'),'Your opponent bet 1 chip.');
 assert.equal(tableStatus(t,'a'),'Waiting for your opponent');
 t.actions=['check'];t.turn='a';assert.equal(tableStatus(t,'a'),'Your opponent checked.');
});
test('Round recap tells the player who folded without exposing hidden cards',()=>{
 const t={players:['a','b'],net:[-1,1],log:[{hand:1,actions:['check','bet','fold'],net:[-1,1],auto:[]}]};
 const own=renderPokerResults(t,{round:1},'a',-1);assert.match(own,/You folded/);assert.match(own,/You lost 1 chip/);
 const opponent=renderPokerResults(t,{round:1},'b',1);assert.match(opponent,/Opponent folded/);assert.doesNotMatch(opponent,/Opponent’s card/);
});
