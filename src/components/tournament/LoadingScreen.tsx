export default function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#02070d] text-white">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />

        <p className="mt-4 text-sm font-bold text-gray-400">
          Cargando fixture...
        </p>
      </div>
    </main>
  );
}