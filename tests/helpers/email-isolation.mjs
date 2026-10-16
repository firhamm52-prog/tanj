// Every non-email browser suite must remain safe even when the deployed configuration is live.
export async function isolateEmail(context){
 await context.route('**/web/supabase-config.js?*',route=>route.fulfill({contentType:'text/javascript',body:'export const supabaseConfig={enabled:false};'}));
 await context.route('https://api.emailjs.com/**',route=>route.abort('blockedbyclient'));
 await context.route('**/web/email-config.js?*',route=>route.fulfill({contentType:'text/javascript',body:'export const emailConfig={enabled:false,serviceId:"",templateId:"",publicKey:""};'}));
}
