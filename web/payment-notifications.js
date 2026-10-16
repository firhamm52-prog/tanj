// Configure a server endpoint only after server-side order validation and email delivery are available.
export async function notifyPayment(order){
 const endpoint=window.TANJ_CONFIG?.paymentNotificationEndpoint;
 if(!endpoint)throw Error('Email otomatis belum aktif. Gunakan kontak email atau WhatsApp di bawah.');
 const target=new URL(endpoint,location.href);
 if(target.origin!==location.origin)throw Error('Endpoint notifikasi harus berada pada domain TANJ yang sama.');
 const response=await fetch(target,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({orderId:order.id}),signal:AbortSignal.timeout(12000)});
 const result=await response.json();
 if(!response.ok||result.sent!==true)throw Error('Email belum terkirim. Coba lagi atau hubungi admin.');
 return result;
}
