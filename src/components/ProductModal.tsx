import { Fragment, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useForm } from 'react-hook-form';

interface ProductForm {
  name: string;
  sku: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  description?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProductForm) => void;
  initial?: Partial<ProductForm> & { id?: string };
  loading?: boolean;
}

export default function ProductModal({ isOpen, onClose, onSubmit, initial, loading }: Props) {
  const { register, handleSubmit, reset } = useForm<ProductForm>();

  useEffect(() => {
    if (isOpen) {
      reset({
        name: initial?.name ?? '',
        sku: initial?.sku ?? '',
        category: initial?.category ?? '',
        price: initial?.price ?? 0,
        cost: initial?.cost ?? 0,
        stock: initial?.stock ?? 0,
        description: initial?.description ?? '',
      });
    }
  }, [isOpen, initial, reset]);

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        <div className="fixed inset-0 bg-black/40" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <Dialog.Title className="text-lg font-semibold mb-4">
              {initial?.id ? 'Edit Product' : 'Add Product'}
            </Dialog.Title>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
              <input {...register('name', { required: true })} placeholder="Name" className="w-full border rounded-lg px-3 py-2 text-sm" />
              <input {...register('sku', { required: true })} placeholder="SKU" disabled={!!initial?.id} className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100" />
              <input {...register('category', { required: true })} placeholder="Category" className="w-full border rounded-lg px-3 py-2 text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <input {...register('price', { valueAsNumber: true })} type="number" step="0.01" placeholder="Price" className="border rounded-lg px-3 py-2 text-sm" />
                <input {...register('cost', { valueAsNumber: true })} type="number" step="0.01" placeholder="Cost" className="border rounded-lg px-3 py-2 text-sm" />
              </div>
              <input {...register('stock', { valueAsNumber: true })} type="number" placeholder="Stock" className="w-full border rounded-lg px-3 py-2 text-sm" />
              <textarea {...register('description')} placeholder="Description" className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button type="submit" disabled={loading} className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm">
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>
    </Transition>
  );
}
