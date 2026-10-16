import {shippingMaster} from './shipping-master.js?v=districts-1';
export const shippingProvinces=shippingMaster.provinces.slice().sort((a,b)=>a.name.localeCompare(b.name,'id'));
export function shippingCities(provinceId){return shippingMaster.cities.filter(city=>city.provinceId===provinceId).sort((a,b)=>a.name.localeCompare(b.name,'id'));}
export function getShippingEstimate(provinceId,cityId){
 const province=shippingMaster.provinces.find(p=>p.id===provinceId);
 const city=shippingMaster.cities.find(c=>c.id===cityId&&c.provinceId===provinceId);
 if(!province||!city)throw Error('Pilih provinsi dan kota/kabupaten yang sesuai.');
 return {id:city.id,provinceId:province.id,province:province.name,city:city.name,name:'Perkiraan ongkir ke '+city.name,fee:city.fee,origin:shippingMaster.origin,weightKg:shippingMaster.weightKg,sourceDate:shippingMaster.date,estimate:true};
}
const areaCache=new Map(),areaAttempts=new Map();
async function cityAreas(cityId){
 const city=shippingMaster.cities.find(c=>c.id===cityId);if(!city)throw Error('Pilih kota/kabupaten yang sesuai.');
 const provinceId=city.provinceId;
 if(!areaCache.has(provinceId)){
  const attempt=areaAttempts.get(provinceId)||0;
  const pending=import(`./shipping-areas/${provinceId}.js?v=districts-1${attempt?'&retry='+attempt:''}`).then(module=>module.cities).catch(()=>{areaCache.delete(provinceId);areaAttempts.set(provinceId,attempt+1);throw Error('Data kecamatan belum bisa dimuat. Periksa koneksi lalu tekan Coba lagi.');});areaCache.set(provinceId,pending);
 }
 return (await areaCache.get(provinceId))[cityId]||[];
}
export async function shippingDistricts(cityId){return (await cityAreas(cityId)).slice().sort((a,b)=>a.name.localeCompare(b.name,'id'));}
export async function shippingPostcodes(cityId,districtId){const district=(await cityAreas(cityId)).find(d=>d.id===districtId);if(!district)throw Error('Pilih kecamatan yang sesuai dengan kota/kabupaten.');return district.postcodes.slice().sort((a,b)=>a.code.localeCompare(b.code));}
export async function validateShippingDestination(provinceId,cityId,districtId,zip){
 const shipping=getShippingEstimate(provinceId,cityId);
 const district=(await cityAreas(cityId)).find(d=>d.id===districtId);
 if(!district)throw Error('Pilih kecamatan yang sesuai dengan kota/kabupaten.');
 if(typeof zip!=='string'||!district.postcodes.some(p=>p.code===zip))throw Error('Pilih kode pos yang sesuai dengan kecamatan.');
 return {shipping,districtId:district.id,district:district.name,zip};
}
