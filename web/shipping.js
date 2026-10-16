import {shippingMaster} from './shipping-master.js?v=shipping-1';
export const shippingProvinces=shippingMaster.provinces.slice().sort((a,b)=>a.name.localeCompare(b.name,'id'));
export function shippingCities(provinceId){return shippingMaster.cities.filter(city=>city.provinceId===provinceId).sort((a,b)=>a.name.localeCompare(b.name,'id'));}
export function getShippingEstimate(provinceId,cityId){
 const province=shippingMaster.provinces.find(p=>p.id===provinceId);
 const city=shippingMaster.cities.find(c=>c.id===cityId&&c.provinceId===provinceId);
 if(!province||!city)throw Error('Pilih provinsi dan kota/kabupaten yang sesuai.');
 return {id:city.id,provinceId:province.id,province:province.name,city:city.name,name:'Perkiraan ongkir ke '+city.name,fee:city.fee,origin:shippingMaster.origin,weightKg:shippingMaster.weightKg,sourceDate:shippingMaster.date,estimate:true};
}
