-- Edge Functions read the published storefront using the server service role.
-- This grants access only to the published catalog RPC, not the admin CMS.
GRANT
EXECUTE ON FUNCTION public.tanj_cms_storefront () TO service_role;
