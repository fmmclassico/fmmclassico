// Show verifying state while checking payment
const [verifyingPayment, setVerifyingPayment] = useState(false);

useEffect(() => {
  const orderNumber = searchParams.get('order');
  const status = searchParams.get('status');

  if (!orderNumber || !user) return;

  setVerifyingPayment(true);
  console.log('[Orders] Payment return - order:', orderNumber, 'status:', status);

  const updateOrderPayment = async () => {
    try {
      const rawOrders = await base44.entities.Order.filter({ order_number: orderNumber });
      const ordersList = Array.isArray(rawOrders) ? rawOrders : Array.isArray(rawOrders?.data) ? rawOrders.data : [];

      if (ordersList.length === 0) {
        setVerifyingPayment(false);
        return;
      }

      const order = ordersList[0];

      if (status === 'success') {
        // Hubtel only redirects to returnUrl on successful payment
        if (order.payment_status !== 'paid') {
          await base44.entities.Order.update(order.id, {
            payment_status: 'paid',
            status: order.status === 'processing' ? 'confirmed' : order.status,
            tracking_updates: [
              ...(order.tracking_updates || []),
              {
                status: 'Payment Confirmed',
                message: 'Payment confirmed via Hubtel.',
                timestamp: new Date().toISOString(),
              }
            ]
          });
        }

        queryClient.invalidateQueries({ queryKey: ['orders'] });
        toast.success('✅ Payment confirmed! Your order has been received.');

        // Clear cart
        if (user?.email) {
          const rawItems = await base44.entities.CartItem.filter({ user_email: user.email });
          const items = Array.isArray(rawItems) ? rawItems : Array.isArray(rawItems?.data) ? rawItems.data : [];
          await Promise.all(items.map(item => base44.entities.CartItem.delete(item.id).catch(() => {})));
          queryClient.invalidateQueries({ queryKey: ['cartItems'] });
        }
      } else {
        // cancelled or other status - verify with API
        const result = await checkPaymentStatus(orderNumber);
        if (result?.data?.status?.toLowerCase() === 'paid') {
          await base44.entities.Order.update(order.id, {
            payment_status: 'paid',
            status: order.status === 'processing' ? 'confirmed' : order.status,
            tracking_updates: [
              ...(order.tracking_updates || []),
              {
                status: 'Payment Confirmed',
                message: 'Payment confirmed via Hubtel verification.',
                timestamp: new Date().toISOString(),
              }
            ]
          });
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          toast.success('✅ Payment confirmed!');
        } else {
          toast.info('Payment not yet confirmed. Please complete payment or contact support.');
        }
      }
    } catch (err) {
      console.error('[Orders] Payment verification error:', err);
    } finally {
      setVerifyingPayment(false);
    }
  };

  updateOrderPayment();
}, [searchParams, queryClient, user]);
