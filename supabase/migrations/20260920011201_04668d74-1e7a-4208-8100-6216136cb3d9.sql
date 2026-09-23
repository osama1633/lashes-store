CREATE OR REPLACE FUNCTION public.place_store_order(_order_number text, _customer_name text, _customer_phone text, _customer_email text, _shipping_address jsonb, _shipping_method_id uuid, _payment_code text, _coupon_code text, _notes text, _items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order_id uuid;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_shipping numeric := 0;
  v_total numeric := 0;
  v_coupon coupons%ROWTYPE;
  v_shipping_method shipping_methods%ROWTYPE;
  v_item jsonb;
  v_product products%ROWTYPE;
  v_quantity integer;
  v_uid uuid := auth.uid();
BEGIN
  IF jsonb_array_length(_items) = 0 THEN RAISE EXCEPTION 'Cart is empty'; END IF;
  IF NULLIF(trim(_customer_name), '') IS NULL OR NULLIF(trim(_customer_phone), '') IS NULL THEN RAISE EXCEPTION 'Customer details required'; END IF;
  SELECT * INTO v_shipping_method FROM shipping_methods WHERE id = _shipping_method_id AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Shipping method unavailable'; END IF;
  IF NOT EXISTS (SELECT 1 FROM payment_methods WHERE code = _payment_code AND is_active) THEN RAISE EXCEPTION 'Payment method unavailable'; END IF;
  FOR v_item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_quantity := (v_item->>'quantity')::integer;
    IF v_quantity < 1 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;
    SELECT * INTO v_product FROM products WHERE id = (v_item->>'product_id')::uuid AND is_active;
    IF NOT FOUND OR v_product.stock < v_quantity THEN RAISE EXCEPTION 'Insufficient stock'; END IF;
    v_subtotal := v_subtotal + COALESCE(v_product.sale_price, v_product.regular_price) * v_quantity;
  END LOOP;
  IF NULLIF(trim(COALESCE(_coupon_code, '')), '') IS NOT NULL THEN
    SELECT * INTO v_coupon FROM coupons WHERE upper(code) = upper(trim(_coupon_code)) AND is_active AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at >= now()) AND minimum_order <= v_subtotal AND (usage_limit IS NULL OR usage_count < usage_limit);
    IF NOT FOUND THEN RAISE EXCEPTION 'Invalid coupon'; END IF;
    v_discount := LEAST(CASE WHEN v_coupon.discount_type = 'percentage' THEN v_subtotal * v_coupon.discount_value / 100 ELSE v_coupon.discount_value END, v_subtotal);
  END IF;
  v_shipping := CASE WHEN v_shipping_method.free_shipping_threshold IS NOT NULL AND v_subtotal >= v_shipping_method.free_shipping_threshold THEN 0 ELSE v_shipping_method.price END;
  v_total := GREATEST(0, v_subtotal - v_discount + v_shipping);
  IF v_uid IS NOT NULL THEN
    INSERT INTO profiles(id, full_name, phone, email, address) VALUES(v_uid, trim(_customer_name), trim(_customer_phone), _customer_email, _shipping_address)
    ON CONFLICT(id) DO UPDATE SET full_name=EXCLUDED.full_name, phone=EXCLUDED.phone, email=EXCLUDED.email, address=EXCLUDED.address;
  END IF;
  INSERT INTO orders(order_number, customer_id, customer_name, customer_phone, customer_email, shipping_address, subtotal, discount_amount, shipping_amount, tax_amount, total, coupon_id, payment_method, shipping_method, notes)
  VALUES(_order_number, v_uid, trim(_customer_name), trim(_customer_phone), _customer_email, _shipping_address, v_subtotal, v_discount, v_shipping, 0, v_total, v_coupon.id, _payment_code, v_shipping_method.name_ar, _notes) RETURNING id INTO v_order_id;
  FOR v_item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_quantity := (v_item->>'quantity')::integer;
    SELECT * INTO v_product FROM products WHERE id = (v_item->>'product_id')::uuid;
    INSERT INTO order_items(order_id, product_id, product_name, sku, unit_price, quantity, line_total)
    VALUES(v_order_id, v_product.id, v_product.name_ar, v_product.sku, COALESCE(v_product.sale_price, v_product.regular_price), v_quantity, COALESCE(v_product.sale_price, v_product.regular_price) * v_quantity);
  END LOOP;
  RETURN jsonb_build_object('order_id', v_order_id, 'order_number', _order_number, 'subtotal', v_subtotal, 'discount', v_discount, 'shipping', v_shipping, 'total', v_total);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.place_store_order(text, text, text, text, jsonb, uuid, text, text, text, jsonb) TO anon, authenticated, service_role;