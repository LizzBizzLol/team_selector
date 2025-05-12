import { Dialog } from "@headlessui/react";

export default function Modal({ open, onClose, ok = true, title, children }) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
          <Dialog.Title className="text-lg font-medium mb-4">
            {ok ? "✅ " : "⛔️ "}{title}
          </Dialog.Title>

          {children}

          <button
            className="mt-6 w-full px-4 py-2 bg-blue-600 text-white rounded"
            onClick={onClose}
          >
            OK
          </button>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
