import { Fragment, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

interface LineItem {
  productId: string;
  quantity: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => void;
  loading?: boolean;
}

const PAYMENT_METHODS = ['CASH', 'CARD', 'BANK_TRANSFER', 'CREDIT'];

export default function SaleModal({ isOpen, onClose, onSubmit, loading }: Props) {
  const [customerId, setCustomerId] = useState('');
  const [items, setItems] = useState<LineItem[]>([{ productId: '', quantity: 1 }]);
  const [tax, setTax] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [notes, setNotes] = useState('');

  const { data: customersData } = useQuery({
    queryKey: ['customers-list'],
    queryFn: () => api.get('/customers', { params: { limit: 200 } }).then((r) => r.data),
    enabled: isOpen,
  });

  const { data: productsData } = useQuery({
    queryKey: ['products-list'],
    queryFn: () => api.get('/products', { params: { limit: 200 } }).then((r) => r.data),
    enabled: isOpen,
  });

  const products = productsData?.products ?? [];
  const customers = customersData?.customers ?? [];

  const subtotal = items.reduce((sum, item) => {
    const product = products.find((p: { id: string }) => p.id === item.productId);
    return sum + (product?.price ?? 0) * item.quantity;
  }, 0);
  const grandTotal = subtotal + tax - discount;

  useEffect(() => {
    if (!isOpen) {
      setCustomerId('');
      setItems([{ productId: '', quantity: 1 }]);
      setTax(0);
      setDiscount(0);
      setNotes('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      customerId,
      items: items.filter((i) => i.productId && i.quantity > 0),
      tax,
      discount,
      paymentMethod,
      notes: notes || undefined,
    });
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40" />
        </Transition.Child>
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <Dialog.Title className="text-lg font-semibold">New Sale</Dialog.Title>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Customer</label>
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  >
                    <option value="">Select customer</option>
                    {customers.map((c: { id: string; name: string }) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium">Line Items</label>
                  {items.map((item, idx) => (
                    <div key={idx} className="flex gap-2">
                      <select
                        value={item.productId}
                        onChange={(e) => {
                          const next = [...items];
                          next[idx].productId = e.target.value;
                          setItems(next);
                        }}
                        className="flex-1 border rounded-lg px-3 py-2 text-sm"
                        required
                      >
                        <option value="">Product</option>
                        {products.map((p: { id: string; name: string; price: number; stock: number }) => (
                          <option key={p.id} value={p.id}>
                            {p.name} — ${p.price} (stock: {p.stock})
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => {
                          const next = [...items];
                          next[idx].quantity = Number(e.target.value);
                          setItems(next);
                        }}
                        className="w-20 border rounded-lg px-2 py-2 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setItems(items.filter((_, i) => i !== idx))}
                        className="text-red-500 p-2"
                        disabled={items.length === 1}
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setItems([...items, { productId: '', quantity: 1 }])}
                    className="text-sm text-brand-600 flex items-center gap-1"
                  >
                    <PlusIcon className="h-4 w-4" /> Add item
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Tax ($)</label>
                    <input type="number" min={0} step={0.01} value={tax} onChange={(e) => setTax(Number(e.target.value))} className="w-full border rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Discount ($)</label>
                    <input type="number" min={0} step={0.01} value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="w-full border rounded-lg px-3 py-2" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Payment Method</label>
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full border rounded-lg px-3 py-2">
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>{m.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full border rounded-lg px-3 py-2" rows={2} />
                </div>

                <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
                  <div className="flex justify-between"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                  <div className="flex justify-between font-bold text-lg"><span>Grand Total</span><span>${grandTotal.toFixed(2)}</span></div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                  <button type="submit" disabled={loading} className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700 disabled:opacity-50">
                    {loading ? 'Creating...' : 'Create Sale'}
                  </button>
                </div>
              </form>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
