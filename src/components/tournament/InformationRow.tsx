type InformationRowProps = {
  label: string;
  value: string;
};

export default function InformationRow({
  label,
  value,
}: InformationRowProps) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-600">
        {label}
      </span>

      <span className="font-black text-gray-300">
        {value}
      </span>
    </div>
  );
}