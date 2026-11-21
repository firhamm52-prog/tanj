import { cloudClient, cloudGuestSession } from './supabase-customer.js?v=hero-ios-20261118';
export async function productLikes(id, selected) {
  const client = await cloudClient();
  if (selected !== undefined) await cloudGuestSession();
  const { data, error } = await client.rpc(
    selected === undefined ? 'tanj_product_likes' : 'tanj_like_product',
    selected === undefined ? { pid: id } : { pid: id, selected },
  );
  if (error)
    throw Error('Suka tersimpan di browser ini. Jumlah suka online belum dapat diperbarui.');
  return data;
}
