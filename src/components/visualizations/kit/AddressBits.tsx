"use client";

/**
 * Address decomposed into its fields (e.g. page number | offset), rendered
 * as labelled bit-groups with the numeric value of each field spelled out.
 */
export interface AddressField {
  label: string;
  /** Width of this field in bits. */
  bits: number;
  /** The field's numeric value. */
  value: number;
}

export function AddressBits({
  fields,
  totalBits,
  value,
  caption,
}: {
  fields: AddressField[];
  totalBits: number;
  /** The full address value the fields came from. */
  value: number;
  caption?: string;
}) {
  const totalFieldBits = fields.reduce((a, f) => a + f.bits, 0);

  return (
    <figure className="rounded-lg border border-line bg-bg-soft p-3">
      {caption ? (
        <figcaption className="mb-2 text-xs text-ink-muted">{caption}</figcaption>
      ) : null}
      <div
        className="flex flex-wrap items-stretch gap-1 font-mono text-xs"
        role="img"
        aria-label={`Address ${value} split into ${fields
          .map((f) => `${f.label} = ${f.value} (${f.bits} bits)`)
          .join(", ")}`}
      >
        {fields.map((f) => (
          <div
            key={f.label}
            className="flex min-w-24 flex-col items-center rounded-md border border-line bg-panel px-2 py-2"
          >
            <span className="text-[12px] font-medium text-ink-muted">{f.label}</span>
            <span className="text-base font-semibold text-ink">{f.value}</span>
            <span className="text-[12px] text-ink-faint">{f.bits} bits</span>
          </div>
        ))}
        {totalFieldBits < totalBits ? (
          <div className="flex min-w-24 flex-col items-center justify-center rounded-md border border-dashed border-line px-2 py-2 text-[12px] text-ink-faint">
            {totalBits - totalFieldBits} unused high bits
          </div>
        ) : null}
      </div>
    </figure>
  );
}
