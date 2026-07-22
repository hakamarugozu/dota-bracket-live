type Props = {
  title: string;
  value: string;
};

export default function InfoCard({
  title,
  value,
}: Props) {
  return (
    <div className="h-16 rounded-lg border border-[#2A2A2A] bg-[#141414] px-4 flex items-center justify-between">

      <span className="text-xs uppercase tracking-wide text-gray-500">
        {title}
      </span>

      <span className="text-sm font-semibold text-white">
        {value}
      </span>

    </div>
  );
}