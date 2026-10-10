// Stable semantic identities survive changes to display order.
export const LEGACY_IDS=['induction','period','inverse','symbols','cover','threshold','shadow','scale'];
export const CAMPAIGN=[
 {id:'induction',chapter:1,group:'intro',title:['那个显然呢？','Where Is the Missing Step?'],runtime:0},
 {id:'addition',chapter:2,group:'school',title:['桥也要做加减','A Little More, a Little Less'],runtime:16},
 {id:'array-arithmetic',chapter:3,group:'school',title:['排开就知道了','Room for Every Block'],runtime:15},
 {id:'scale',chapter:4,group:'school',title:['小一点试试','Try a Smaller Bird'],runtime:7},
 {id:'period',chapter:5,group:'school',title:['你俩商量好了吗？','Same Place, Same Time'],runtime:1},
 {id:'paired-switches',chapter:6,group:'school',title:['刚亮怎么又灭了','Two Planks Got the Memo'],runtime:12},
 {id:'adjacent-swaps',chapter:7,group:'school',title:['高的先别急','Please Mind the Order'],runtime:18},
 {id:'reflection',chapter:8,group:'school',title:['拐个弯再说','The Light Takes a Turn'],runtime:13},
 {id:'composition',chapter:9,group:'school',title:['顺序真有关系','Order Matters Here'],runtime:14},
 {id:'vector-wind',chapter:10,group:'school',title:['风往哪边使劲？','Which Way Is the Push?'],runtime:19},
 {id:'shadow',chapter:11,group:'transition',title:['我过去了，我影子呢？','Did My Shadow Make It?'],runtime:6},
 {id:'threshold',chapter:12,group:'transition',title:['到底什么时候','Eventually. But When?'],runtime:5},
 {id:'derivative',chapter:13,group:'university',title:['顺着这一点飞','Take the Tangent'],runtime:10},
 {id:'integral',chapter:14,group:'university',title:['刚才流过去多少？','Every Drop Counts'],runtime:9},
 {id:'series',chapter:15,group:'university',title:['后面还有一点','There Is Always a Tail'],runtime:8},
 {id:'inverse',chapter:16,group:'university',title:['反着走的机关','An Inverse, Not a Rewind'],runtime:2},
 {id:'symbols',chapter:17,group:'university',title:['路只记两步','The Path Remembers'],runtime:3},
 {id:'wrap',chapter:18,group:'university',title:['右边出去，左边回来','Around the Same Page'],runtime:17},
 {id:'cover',chapter:19,group:'university',title:['几乎有桥','Almost a Bridge'],runtime:4},
 {id:'almost-everywhere',chapter:20,group:'university',title:['这一点另说','Except for This Point'],runtime:11},
];
export const KNOWN_IDS=[...new Set([...LEGACY_IDS,...CAMPAIGN.map(c=>c.id)])];
export const chapterForRuntime=i=>CAMPAIGN.find(c=>c.runtime===i);
export const idForRuntime=i=>chapterForRuntime(i)?.id||LEGACY_IDS[i];
export const availableChapters=runtimeCount=>CAMPAIGN.filter(c=>Number.isInteger(c.runtime)&&c.runtime<runtimeCount);
export function nextAvailable(runtime,runtimeCount){const ready=availableChapters(runtimeCount),at=ready.findIndex(c=>c.runtime===runtime);return ready[at+1]||null;}
export function continueAvailable(progress,runtimeCount){const ready=availableChapters(runtimeCount),previous=ready.find(c=>c.id===progress.lastId);return (previous&&!progress.records[previous.id]?.completed?previous.runtime:null)??ready.find(c=>!progress.records[c.id]?.completed)?.runtime??previous?.runtime??ready[0]?.runtime??0;}
