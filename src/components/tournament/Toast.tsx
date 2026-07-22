type ToastProps = {
  message: string;
  onClose: () => void;
};

export default function Toast({
  message,
  onClose,
}: ToastProps) {
  return (
    <div className="fixed right-4 top-24 z-[100] w-[calc(100%-2rem)] max-w-sm sm:right-6">
      <div className="flex items-start gap-3 rounded-xl border border-red-500/35 bg-[#101820]/95 px-4 py-3 shadow-2xl backdrop-blur-xl">
        <span className="text-red-300">✓</span>

        <p className="flex-1 text-sm font-bold text-gray-200">
          {message}
        </p>

        <button
          type="button"
          onClick={onClose}
          className="text-gray-500 hover:text-white"
        >
          ×
        </button>
      </div>
    </div>
  );
}