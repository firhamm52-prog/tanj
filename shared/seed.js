export const DEMO_KEY = 'tanj-studio-draft-v1';
export const PUBLISHED_KEY = 'tanj-studio-published-v1';
const collections = [
  ['Embroidered Outer', 'Detail bordir untuk hari yang istimewa.'],
  ['Everyday Drape Outer', 'Lapisan ringan untuk setiap hari.'],
  ['Flow Dress', 'Siluet sederhana yang bergerak bersamamu.'],
  ['Flow Dress Belted', 'Potongan anggun dengan detail ikat pinggang.']
].map(([name, description], i) => ({ id: `base-${i}`, name, description }));
const variants = [
  ['TANJ Sand','Cream','#eee6d7','campaign-beige','look-2'],
  ['TANJ Noir','Hitam','#292527','campaign-black','look-3'],
  ['TANJ Cocoa','Cokelat','#735247','campaign-brown','embroidered-cocoa'],
  ['Cocoa','Cokelat','#735247','drape-v3-cocoa-model','drape-v2-cocoa-product'],
  ['Black','Hitam','#292527','drape-v3-black-model','drape-v2-black-product'],
  ['Ivory','Ivory','#eee6d7','drape-v3-ivory-model','drape-v2-ivory-product'],
  ['Cream','Cream','#eee6d7','flow-v3-cream-model','flow-v3-cream-product'],
  ['Black','Hitam','#292527','flow-v3-black-model','flow-v3-black-product'],
  ['Ash','Abu-abu','#837c7d','flow-v3-ash-model','flow-v3-ash-product'],
  ['Cream','Cream','#eee6d7','flow-belted-cream-model','flow-belted-cream-product'],
  ['Black','Hitam','#292527','flow-belted-black-model','flow-belted-black-product'],
  ['Ash','Abu-abu','#837c7d','flow-belted-ash-model','flow-belted-ash-product']
];
export const seed = {
  collections,
  products: variants.map(([name,colorName,color,model,product], i) => ({
    id: `base-${Math.floor(i/3)}-${i%3}`, collectionId: `base-${Math.floor(i/3)}`,
    name,colorName,color,model:`assets/${model}.webp`,product:`assets/${product}.webp`,
    price:695000,stock: i === 8 ? 0 : 12 + i*3,inStock:i!==8,status:'published'
  })),
  hijabs: [ ['selcuk','brown',249000],['selcuk','gray',249000],['georgia','white',195000],['georgia','nude',195000],['georgia','black',195000],['georgia','cream',195000] ].map(([collection,color,price],i)=>({
    id:`hijab-${collection}-${color}`,collection,color,name:`${collection[0].toUpperCase()+collection.slice(1)} ${color[0].toUpperCase()+color.slice(1)}`,
    price,stock:18+i,inStock:true,image:`assets/hijab-${collection}-${color}${color==='cream'?'-poster':''}.webp`
  })),
  hero:{media:'assets/noireaterial-desert-three-models-v3.mp4'},
  banner:{enabled:false,title:'The everyday edit',subtitle:'Siluet yang menemani setiap langkah.',mediaType:'image',media:'assets/campaign-beige.webp'},
  slides:[
  {
    "id": "slide-1",
    "caption": "Hijab Selcuk Brown TANJ",
    "mediaType": "image",
    "media": "assets/hijab-selcuk-brown.webp"
  },
  {
    "id": "slide-2",
    "caption": "Hijab Selcuk Gray TANJ",
    "mediaType": "image",
    "media": "assets/hijab-selcuk-gray.webp"
  },
  {
    "id": "slide-3",
    "caption": "Hijab Georgia White TANJ",
    "mediaType": "image",
    "media": "assets/hijab-georgia-white.webp"
  },
  {
    "id": "slide-4",
    "caption": "Hijab Georgia Nude TANJ",
    "mediaType": "image",
    "media": "assets/hijab-georgia-nude.webp"
  },
  {
    "id": "slide-5",
    "caption": "Hijab Georgia Black TANJ",
    "mediaType": "image",
    "media": "assets/hijab-georgia-black.webp"
  },
  {
    "id": "slide-6",
    "caption": "Hijab Georgia Cream TANJ",
    "mediaType": "video",
    "media": "assets/hijab-georgia-cream.mp4"
  }
]
};
export function freshSeed(){ return structuredClone(seed); }
export function storefront(state){
  return {...state, products:state.products.filter(p=>p.status!=='draft').map(p=>({...p,inStock:p.stock>0})),hijabs:state.hijabs.map(p=>({...p,inStock:p.stock>0}))};
}
