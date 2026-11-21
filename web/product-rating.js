import { cloudClient, cloudGuestSession } from './supabase-customer.js?v=hero-ios-20261118';
export async function productRating(id, score) {
  const client = await cloudClient();
  if (score !== undefined) await cloudGuestSession();
  const { data, error } = await client.rpc(
    score === undefined ? 'tanj_product_rating' : 'tanj_rate_product',
    score === undefined ? { pid: id } : { pid: id, score },
  );
  if (error)
    throw Error(
      ['PGRST202', '42883'].includes(error.code)
        ? 'Penilaian belum aktif. Admin perlu menjalankan SQL 032.'
        : 'Penilaian belum dapat diproses. Coba lagi.',
    );
  return data;
}
