import {C_CONFIG} from './c-mode.mjs';
export const ORIGINAL_CONTROLS=Object.freeze([[13,3.1,'x'],[15.5,3.1,'y'],[40.5,3.7,'x'],[43,3.7,'y']].map(Object.freeze));
export const C_CONTROL_CLEARANCE=.08;
// Keep pair midpoint, physical button size and axis/order/head-hit semantics.
// Total center-to-center distance = button width + player width + clearance.
export function controlLayout(cMode=false){
 if(!cMode)return ORIGINAL_CONTROLS;
 const half=(1.8+C_CONFIG.width+C_CONTROL_CLEARANCE)/2;
 return [[14.25-half,3.1,'x'],[14.25+half,3.1,'y'],[41.75-half,3.7,'x'],[41.75+half,3.7,'y']];
}
