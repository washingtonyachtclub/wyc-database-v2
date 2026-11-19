import { formatRentalMoney, type RentalSubtotal } from '@/domains/keelboat-calendar/pricing'

export function RentalBreakdown({ subtotal }: { subtotal: RentalSubtotal }) {
  return (
    <div className="space-y-3">
      <dl className="space-y-3 text-sm">
        {subtotal.lines.map((line) => (
          <div key={line.key} className="flex justify-between gap-4">
            <dt>
              <span>{line.label}</span>
              <span className="block text-xs text-muted-foreground">
                {formatRentalMoney(line.unitCents, subtotal.currency)} × {line.quantity}
              </span>
            </dt>
            <dd className="tabular-nums">
              {formatRentalMoney(line.amountCents, subtotal.currency)}
            </dd>
          </div>
        ))}
        <div className="flex justify-between border-t pt-3 font-semibold">
          <dt>Total</dt>
          <dd className="tabular-nums">
            {formatRentalMoney(subtotal.amountCents, subtotal.currency)}
          </dd>
        </div>
      </dl>
    </div>
  )
}
