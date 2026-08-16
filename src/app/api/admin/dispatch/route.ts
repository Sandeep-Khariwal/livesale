import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { Order } from '../../../../models/Order';
import { ShippingAddress } from '../../../../models/ShippingAddress';
import { Customer } from '../../../../models/Customer';
import { OrderStatusHistory } from '@/models/OrderStatusHistory';
import dbConnect from '../../../../lib/mongoose';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ---- GET: list dispatch-ready OR already-dispatched orders ----
export async function GET(req: NextRequest) {
  await dbConnect();

  const view = req.nextUrl.searchParams.get('view') || 'pending';

  // Keep these values as string literals so Mongoose's TypeScript
  // types don't widen them to `string`.
  const filter =
    view === 'dispatched'
      ? { orderStatus: 'SHIPPED' as const }
      : {
          paymentStatus: 'VERIFIED' as const,
          orderStatus: 'CONFIRMED' as const,
        };

  const orders = await Order.find(filter)
    .sort(
      view === 'dispatched'
        ? { dispatchedAt: -1 }
        : { createdAt: 1 }
    )
    .lean();

  const orderIds = orders.map((o) => o._id);
  const customerIds = orders.map((o) => o.customerId);

  const [addresses, customers] = await Promise.all([
    ShippingAddress.find({
      orderId: { $in: orderIds },
    }).lean(),

    Customer.find({
      _id: { $in: customerIds },
    }).lean(),
  ]);

  const addressByOrderId = new Map(
    addresses.map((a) => [String(a.orderId), a])
  );

  const customerById = new Map(
    customers.map((c) => [String(c._id), c])
  );

  const result = orders.map((order: any) => ({
    id: String(order._id),
    orderNumber: order.orderNumber,
    productCode: order.productCodeSnapshot,
    amount: order.amount,

    customer:
      customerById.get(String(order.customerId)) || null,

    address:
      addressByOrderId.get(String(order._id)) || null,

    createdAt: order.createdAt,

    // Dispatch info — only meaningful for "dispatched" view
    dispatchedAt: order.dispatchedAt || null,
    courierName: order.courierName || null,
    trackingId: order.trackingId || null,
  }));

  return NextResponse.json(
    { orders: result },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}

// ---- PATCH: mark an order dispatched ----
export async function PATCH(req: NextRequest) {
  await dbConnect();

  const {
    orderId,
    courierName,
    trackingId,
    adminId,
  } = await req.json();

  if (!orderId) {
    return NextResponse.json(
      { error: 'orderId is required' },
      { status: 400 }
    );
  }

  const existing = await Order.findById(orderId).lean();

  if (!existing) {
    return NextResponse.json(
      { error: 'Order not found' },
      { status: 404 }
    );
  }

  if (
    existing.paymentStatus !== 'VERIFIED' ||
    existing.orderStatus !== 'CONFIRMED'
  ) {
    return NextResponse.json(
      {
        error:
          'Order is not eligible for dispatch (payment not verified or not confirmed)',
      },
      { status: 400 }
    );
  }

  const fromStatus = existing.orderStatus;

  const update: any = {
    orderStatus: 'SHIPPED',
    dispatchedAt: new Date(),
    courierName,
    trackingId,
  };

  if (adminId) {
    update.dispatchedById = new mongoose.Types.ObjectId(adminId);
  }

  // Use findOneAndUpdate instead of findById + save so Mongoose only
  // updates the fields being changed. This avoids re-validating the
  // entire document and causing failures on legacy/incomplete orders.
  //
  // The status conditions in the filter also make the operation atomic,
  // preventing the same order from being dispatched twice.
  const order = await Order.findOneAndUpdate(
    {
      _id: orderId,
      paymentStatus: 'VERIFIED',
      orderStatus: 'CONFIRMED',
    },
    {
      $set: update,
    },
    {
      new: true,
    }
  );

  if (!order) {
    return NextResponse.json(
      {
        error: 'Order not found or already processed',
      },
      { status: 400 }
    );
  }

  await OrderStatusHistory.create({
    orderId: order._id,
    fromStatus,
    toStatus: 'SHIPPED',
    note: trackingId
      ? `Dispatched via ${courierName || 'courier'} - ${trackingId}`
      : 'Dispatched',
  });

  return NextResponse.json({
    success: true,
    order,
  });
}