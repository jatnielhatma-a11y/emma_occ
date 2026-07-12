import { ImportWizard } from "@/components/import/ImportWizard";

export default function RosterImportPage() {
  return (
    <div className="space-y-5">
      <section>
        <p className="text-xs uppercase tracking-[0.18em] text-occ-cyan">Roster intake</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Import and classify duties</h2>
        <p className="mt-2 max-w-3xl text-sm text-zinc-400">
          New imports are compared with the previous roster before any calendar sync is allowed.
        </p>
      </section>
      <ImportWizard />
    </div>
  );
}
