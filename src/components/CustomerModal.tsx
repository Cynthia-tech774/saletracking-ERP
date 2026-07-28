import { Fragment, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useForm } from 'react-hook-form';

interface CustomerForm {
  name: string;
  email: string;
  phone: string;
  address: string;
  company?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CustomerForm) => void;
  initial?: Partial<CustomerForm> & { id?: string };
  loading?: boolean;
}

export default function CustomerModal({ isOpen, onClose, onSubmit, initial, loading }: Props) {
  const { register, handleSubmit, reset } = useForm<CustomerForm>();

  useEffect(() => {
    if (isOpen) {
      reset({
        name: initial?.name ?? '',
        email: initial?.email ?? '',
        phone: initial?.phone ?? '',
        address: initial?.address ?? '',
        company: initial?.company ?? '',
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
              {initial?.id ? 'Edit Customer' : 'Add Customer'}
            </Dialog.Title>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
              <input {...register('name', { required: true })} placeholder="Name" className="w-full border rounded-lg px-3 py-2 text-sm" />
              <input {...register('email', { required: true })} type="email" placeholder="Email" className="w-full border rounded-lg px-3 py-2 text-sm" />
              <input {...register('phone', { required: true })} placeholder="Phone" className="w-full border rounded-lg px-3 py-2 text-sm" />
              <input {...register('address', { required: true })} placeholder="Address" className="w-full border rounded-lg px-3 py-2 text-sm" />
              <input {...register('company')} placeholder="Company (optional)" className="w-full border rounded-lg px-3 py-2 text-sm" />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button type="submit" disabled={loading} className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm">Save</button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>
    </Transition>
  );
}
