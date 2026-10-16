// Fixed official destinations; courier text can never supply an arbitrary URL.
export function shipmentTracking(courier){
 const name=String(courier||'').trim().toLowerCase();
 if(/^(j\s*&\s*t|j\s*and\s*t|jt)(\b|[-_])/.test(name))return {name:'J&T',url:'https://www.jet.co.id/track'};
 if(/^jne(\b|[-_])/.test(name))return {name:'JNE',url:'https://jne.co.id/tracking-package'};
 if(/^lion(?:\s*parcel|[-_]regpack|\b)/.test(name))return {name:'Lion Parcel',url:'https://lionparcel.com/track'};
 return null;
}
