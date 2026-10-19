export const OLD_TOWN_NODES = [
    { id: 'north', x: 31, y: 18, tilt: '-4deg' },
    { id: 'south', x: 30, y: 82, tilt: '3deg' },
    { id: 'castle', x: 48, y: 50, tilt: '-2deg' },
    { id: 'east', x: 79, y: 50, tilt: '4deg' },
  ];
export const OLD_TOWN_EDGES = [
    { id: 'nc1', a: 'north', b: 'castle', curve: -13 },
    { id: 'nc2', a: 'north', b: 'castle', curve: 13 },
    { id: 'sc1', a: 'south', b: 'castle', curve: -13 },
    { id: 'sc2', a: 'south', b: 'castle', curve: 13 },
    { id: 'ne', a: 'north', b: 'east', curve: -9 },
    { id: 'se', a: 'south', b: 'east', curve: 9 },
    { id: 'ce', a: 'castle', b: 'east', curve: 0 },
  ];
export const RING_NODES = [
    { id: 'aurora', x: 50, y: 14, tilt: '-2deg' },
    { id: 'pine', x: 82, y: 38, tilt: '4deg' },
    { id: 'harbor', x: 70, y: 80, tilt: '-4deg' },
    { id: 'market', x: 30, y: 80, tilt: '3deg' },
    { id: 'mill', x: 18, y: 38, tilt: '-4deg' },
  ];
export const RING_EDGES = [
    { id: 'ap', a: 'aurora', b: 'pine', curve: 6 },
    { id: 'ph', a: 'pine', b: 'harbor', curve: 5 },
    { id: 'hm', a: 'harbor', b: 'market', curve: 5 },
    { id: 'mw', a: 'market', b: 'mill', curve: 5 },
    { id: 'wa', a: 'mill', b: 'aurora', curve: 6 },
  ];
export const BRIDGE_BASES=[0,1,2].map(i=>({kind:i===1?'ring':'town',nodes:i===1?RING_NODES:OLD_TOWN_NODES,edges:i===1?RING_EDGES:OLD_TOWN_EDGES,repairs:i===1?null:{close:'ce',double:['nc1','nc2'],add:{id:'ns-new',a:'north',b:'south',curve:30}}}));
