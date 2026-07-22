export default function InstructionsPanel() {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b1219] p-4 text-xs leading-relaxed text-gray-500">
      <h3 className="font-black text-white">
        CÓMO ADMINISTRAR
      </h3>

      <p className="mt-4">
        1. Haz clic sobre el equipo ganador.
      </p>

      <p className="mt-2">
        2. Selecciona o escribe el resultado.
      </p>

      <p className="mt-2">
        3. Confirma para avanzar al equipo.
      </p>

      <p className="mt-2">
        4. Usa “Corregir resultado” si te equivocas.
      </p>
    </div>
  );
}