import { requireStaff } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { importPricesAction, importUnitsAction } from "./actions";

export const metadata = { title: "Import from CSV" };

export default async function ImportPage() {
  const user = await requireStaff("products");
  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title="Import from CSV"
        subtitle="Download the current data, edit it in Excel or Google Sheets, save as CSV and upload it here. If any row has a problem, nothing is changed."
      />

      <ImportCard
        title="1. Prices"
        steps={[
          "One row per model, matched by slug. Don't change the slug or name columns.",
          "Amounts in rupees, without GST: daily_rate, weekly_rate (per 7 days), monthly_rate (per 30 days), deposit, sale_price. Leave weekly/monthly blank if you don't offer them, and sale_price blank for \"price on request\".",
          "rentable, for_sale and active are yes or no. Set active to no for models you don't stock, to hide them from the website.",
        ]}
        href="/admin/import/template/prices"
        action={importPricesAction}
      />

      {canAccess(user.role, "units") ? (
        <ImportCard
          title="2. Fleet (units)"
          steps={[
            "One row per physical instrument. product_slug must match a slug from the prices file.",
            "Existing serial numbers are updated; new ones are added. To take a unit out of service, set status to RETIRED (or MAINTENANCE) rather than deleting the row. Do this for the DEMO-… units.",
            "purchase_date as 2026-10-31 (31-10-2026 also works) and purchase_cost in rupees. These are optional and feed the payback report.",
          ]}
          href="/admin/import/template/units"
          action={importUnitsAction}
        />
      ) : null}
    </div>
  );
}

function ImportCard({
  title,
  steps,
  href,
  action,
}: {
  title: string;
  steps: string[];
  href: string;
  action: typeof importPricesAction;
}) {
  return (
    <Card>
      <CardHeader
        title={title}
        action={
          <a href={href} className="text-sm font-semibold text-orange-700 hover:underline">
            Download current CSV
          </a>
        }
      />
      <div className="space-y-4 p-5">
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
          {steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <ActionForm action={action} resetOnSuccess className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input type="file" name="file" accept=".csv,text/csv" required className="text-sm" />
          <SubmitButton pendingText="Importing…">Upload &amp; import</SubmitButton>
        </ActionForm>
      </div>
    </Card>
  );
}
