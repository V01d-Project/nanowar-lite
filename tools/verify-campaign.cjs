const C=require('../src/campaign.js');
const c=C.create();
console.log('start points:',c.points);
console.log('completed entries:',Object.keys(c.completed).length);
console.log('re-award lvl5/0:',C.award(c,5,0),'points now:',c.points);
let spent=0;for(const k of ['speed','time','shield','special']){while(C.cost(c,k)!==null){spent+=C.cost(c,k);C.buy(c,k);}}
console.log('spent:',spent,'left:',c.points,'upgrades:',JSON.stringify(c.upgrades));
