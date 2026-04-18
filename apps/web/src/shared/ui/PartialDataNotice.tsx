type PartialDataNoticeProps = {
  show: boolean;
  label?: string;
};

export function PartialDataNotice({ show, label = "This item has partial nutrition data." }: PartialDataNoticeProps) {
  if (!show) {
    return null;
  }

  return (
    <div className="rounded-2xl bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-800 ring-1 ring-amber-100">
      {label} Missing values are not guessed.
    </div>
  );
}
