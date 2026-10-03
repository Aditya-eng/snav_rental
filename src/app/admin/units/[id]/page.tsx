import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { formatDate, toDateInput, todayIST } from "@/lib/dates";
import { formatINR, paiseToRupees } from "@/lib/money";
import { UNIT_STATUS } from "@/lib/constants";
import { Card, CardHeader, Field, Input, PageHeader, Select, Table, Textarea } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { BookingStatusBadge } from "@/components/status-badge";
import { addMaintenanceAction, deleteUnitAction, updateUnitAction } from "../../products/actions";

export default async function UnitPage(props: PageProps<"/admin/units/[id]">) {
  await requireStaff("units");
  const { id } = await props.params;
  const unit = await db.unit.findUnique({
    where: { id },
    include: {
      product: true,
      maintenance: { orderBy: { date: "desc" } },
      assignments: { include: { booking: { include: { items: true } } }, orderBy: { booking: { startDate: "desc" } } },
    },
  });
  if (!unit) notFound();

  // Revenue attributed to this unit: its share of each booking line for its product.
  const revenue = unit.assignments.reduce((sum, a) => {
    if (["CANCELLED", "PENDING_PAYMENT", "REQUESTED"].includes(a.booking.status)) return sum;
    const line = a.booking.items.find((i) => i.productId === unit.productId && i.kind === "RENTAL");
    return sum + (line ? Math.round(line.amount / line.quantity) : 0);
  }, 0);
  const maintenanceCost = unit.maintenance.reduce((s, m) => s + m.cost, 0);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href={`/admin/products/${unit.productId}`} className="text-sm text-slate-500 hover:text-slate-800">← {unit.product.name}</Link>
        <PageHeader title={<span className="font-mono">{unit.serialNumber}</span>} subtitle={unit.product.name} />
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ["Rentals", String(unit.assignments.length)],
          ["Rental revenue", formatINR(revenue)],
          ["Maintenance spend", formatINR(maintenanceCost)],
          ["Payback", unit.purchaseCost ? `${Math.round(((revenue - maintenanceCost) / unit.purchaseCost) * 100)}%` : "Add cost"],
        ].map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader title="Unit details" />
        <ActionForm action={updateUnitAction} className="grid gap-4 p-5 sm:grid-cols-2">
          <input type="hidden" name="id" value={unit.id} />
          <Field label="Serial number">
            <Input name="serialNumber" defaultValue={unit.serialNumber} required className="font-mono" />
          </Field>
          <Field label="Status" hint="Only “In fleet” units can be booked.">
            <Select name="status" defaultValue={unit.status}>
              {Object.entries(UNIT_STATUS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Condition">
            <Input name="condition" defaultValue={unit.condition} />
          </Field>
          <Field label="Firmware">
            <Input name="firmware" defaultValue={unit.firmware ?? ""} />
          </Field>
          <Field label="Purchase date">
            <Input type="date" name="purchaseDate" defaultValue={unit.purchaseDate ? toDateInput(unit.purchaseDate) : ""} />
          </Field>
          <Field label="Purchase cost (₹)">
            <Input name="purchaseCost" inputMode="decimal" defaultValue={paiseToRupees(unit.purchaseCost)} />
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <Textarea name="notes" defaultValue={unit.notes ?? ""} rows={2} className="min-h-0" />
          </Field>
          <div className="sm:col-span-2">
            <SubmitButton pendingText="Saving…">Save unit</SubmitButton>
          </div>
        </ActionForm>
      </Card>

      <Card>
        <CardHeader title="Maintenance & calibration log" />
        <ActionForm action={addMaintenanceAction} resetOnSuccess className="grid gap-3 border-b border-slate-100 p-5 sm:grid-cols-3">
          <input type="hidden" name="unitId" value={unit.id} />
          <Field label="Type">
            <Select name="kind" defaultValue="MAINTENANCE">
              <option value="MAINTENANCE">Maintenance</option>
              <option value="CALIBRATION">Calibration</option>
              <option value="REPAIR">Repair</option>
              <option value="FIRMWARE">Firmware update</option>
            </Select>
          </Field>
          <Field label="Date">
            <Input type="date" name="date" defaultValue={toDateInput(todayIST())} />
          </Field>
          <Field label="Next due (optional)">
            <Input type="date" name="nextDue" />
          </Field>
          <Field label="Work done" className="sm:col-span-2">
            <Input name="note" required />
          </Field>
          <Field label="Cost (₹)">
            <Input name="cost" inputMode="decimal" defaultValue="0" />
          </Field>
          <Field label="New firmware version (for firmware updates)">
            <Input name="firmware" />
          </Field>
          <div className="flex items-end sm:col-span-2">
            <SubmitButton variant="secondary" pendingText="Adding…">Add entry</SubmitButton>
          </div>
        </ActionForm>
        {unit.maintenance.length ? (
          <Table>
            <thead>
              <tr><th>Date</th><th>Type</th><th>Work</th><th>Cost</th><th>Next due</th><th>By</th></tr>
            </thead>
            <tbody>
              {unit.maintenance.map((m) => (
                <tr key={m.id}>
                  <td className="whitespace-nowrap">{formatDate(m.date)}</td>
                  <td>{m.kind.toLowerCase()}</td>
                  <td>{m.note}</td>
                  <td>{m.cost ? formatINR(m.cost) : "—"}</td>
                  <td className="whitespace-nowrap">{formatDate(m.nextDue)}</td>
                  <td className="text-slate-500">{m.createdBy}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <p className="px-5 py-4 text-sm text-slate-500">No entries yet.</p>
        )}
      </Card>

      <Card>
        <CardHeader title="Rental history" />
        {unit.assignments.length ? (
          <Table>
            <tbody>
              {unit.assignments.map((a) => (
                <tr key={a.id}>
                  <td><Link href={`/admin/bookings/${a.booking.code}`} className="font-semibold text-orange-700">{a.booking.code}</Link></td>
                  <td>{formatDate(a.booking.startDate)} – {formatDate(a.booking.endDate)}</td>
                  <td><BookingStatusBadge status={a.booking.status} /></td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <p className="px-5 py-4 text-sm text-slate-500">Never rented yet.</p>
        )}
      </Card>

      {unit.assignments.length === 0 ? (
        <ActionForm action={deleteUnitAction} confirm={`Delete unit ${unit.serialNumber}?`}>
          <input type="hidden" name="id" value={unit.id} />
          <SubmitButton variant="danger" size="sm" pendingText="Deleting…">Delete unit</SubmitButton>
        </ActionForm>
      ) : null}
    </div>
  );
}
