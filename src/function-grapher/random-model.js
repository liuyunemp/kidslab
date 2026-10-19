// Parameters for open experiments, using the same ranges as their controls.
export function parameterSet(base, rng) {
  const values = {};
  for (const [key, [min,max,step]] of Object.entries(base.ranges)) {
    const ticks = Math.floor((max-min)/step+1e-8);
    values[key] = Number((min+rng.int(0,ticks)*step).toFixed(8));
  }
  return { ...base, values };
}
export function validParameters(value, base) {
  return value && value.values && Object.entries(base.ranges).every(([key,[min,max,step]]) => {
    const n=value.values[key];
    return Number.isFinite(n)&&n>=min&&n<=max&&(n===base.values?.[key]||Math.abs((n-min)/step-Math.round((n-min)/step))<1e-6);
  });
}
export const sampling = (base,rng) => ({...base,seed:rng.int(0,0xffffffff),n:rng.int(2,20)*4});
export const validSampling = value => value && Number.isInteger(value.seed)&&value.seed>=0&&value.seed<=0xffffffff&&Number.isInteger(value.n)&&value.n>=8&&value.n<=80&&['simple','stratified','cluster','convenience'].includes(value.method);
