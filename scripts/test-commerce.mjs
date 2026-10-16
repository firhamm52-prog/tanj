import {spawn} from 'node:child_process';
for(const args of [['--test','tests/order-email.test.mjs','tests/emailjs-delivery.test.mjs','tests/payment-review.test.mjs'],['tests/emailjs-checkout.mjs'],['tests/checkout-experience.mjs'],['tests/payment-admin.mjs'],['tests/manual-payments.mjs']]){
 const code=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,args,{stdio:'inherit'});child.once('error',reject);child.once('exit',resolve);});
 if(code!==0){process.exitCode=code||1;break;}
}
