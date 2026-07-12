import { NextResponse } from "next/server";
import { compareImports, detectConflicts, summarizeDuties } from "@/lib/roster/core";
import { extractRosterFile, extractRosterText } from "@/lib/roster/extract";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { NormalizedDuty, RosterConflict } from "@/lib/roster/types";

function toDutyInsert(userId: string, rosterId: string, importId: string, duty: NormalizedDuty) {
  const startsAt = !duty.isOff && duty.startTime ? `${duty.date}T${duty.startTime}:00` : null;
  const endsDate = duty.isOvernight ? addDay(duty.date) : duty.date;
  const endsAt = !duty.isOff && duty.endTime ? `${endsDate}T${duty.endTime}:00` : null;

  return {
    user_id: userId,
    roster_id: rosterId,
    import_id: importId,
    duty_date: duty.date,
    start_time: duty.startTime || null,
    end_time: duty.endTime || null,
    starts_at: startsAt,
    ends_at: endsAt,
    original_duty_code: duty.originalDutyCode || null,
    duty_label: duty.dutyLabel,
    location: duty.location || null,
    notes: duty.notes || null,
    source_file: duty.sourceFile || null,
    source_row: duty.sourceRow,
    is_off: duty.isOff,
    is_overnight: duty.isOvernight,
    is_sick_leave: false
  };
}

function addDay(date: string) {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

function toConflictInsert(userId: string, importId: string, conflict: RosterConflict) {
  return {
    user_id: userId,
    import_id: importId,
    severity: conflict.severity,
    conflict_type: conflict.conflictType,
    title: conflict.title,
    detail: conflict.detail
  };
}

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "You must be signed in to import a roster." }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const rosterText = String(formData.get("rosterText") ?? "").trim();

    if (!(file instanceof File) && !rosterText) {
      return NextResponse.json({ ok: false, error: "Attach a roster file or paste roster text before importing." }, { status: 400 });
    }

    const rosterFile = file instanceof File ? file : null;
    const sourceName = rosterFile ? rosterFile.name : "manual-roster-text";
    const sourceType = rosterFile ? rosterFile.type || "unknown" : "text/plain";
    const sourceSize = rosterFile ? rosterFile.size : new TextEncoder().encode(rosterText).length;
    const extraction = rosterText ? extractRosterText(rosterText, sourceName) : await extractRosterFile(rosterFile!);
    const duties = extraction.duties;

    if (duties.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: extraction.extractor === "image" ? "No roster duties could be extracted from that image." : "No roster duties could be extracted.",
          warnings: extraction.warnings
        },
        { status: 422 }
      );
    }

    const dates = duties.map((duty) => duty.date).sort();
    const dateStart = dates[0];
    const dateEnd = dates[dates.length - 1];

    const { data: previousDuties = [] } = await supabase
      .from("duties")
      .select("duty_date,start_time,end_time,original_duty_code,duty_label,location,notes,source_file,source_row,is_off,is_overnight")
      .eq("user_id", user.id)
      .gte("duty_date", dateStart)
      .lte("duty_date", dateEnd)
      .order("duty_date", { ascending: true });

    const previousNormalized = (previousDuties ?? []).map((duty: any) => ({
      date: duty.duty_date,
      startTime: duty.start_time?.slice(0, 5) ?? "",
      endTime: duty.end_time?.slice(0, 5) ?? "",
      originalDutyCode: duty.original_duty_code ?? "",
      dutyLabel: duty.duty_label,
      location: duty.location ?? "",
      notes: duty.notes ?? "",
      sourceFile: duty.source_file ?? "",
      sourceRow: duty.source_row,
      isOff: duty.is_off,
      isOvernight: duty.is_overnight
    }));

    const conflicts = detectConflicts(duties);
    const comparison = compareImports(previousNormalized, duties);
    const summary = summarizeDuties(duties, conflicts);

    const { data: roster, error: rosterError } = await supabase
      .from("rosters")
      .insert({
        user_id: user.id,
        name: sourceName,
        date_start: dateStart,
        date_end: dateEnd
      })
      .select("id")
      .single();

    if (rosterError) throw rosterError;

    const { data: importBatch, error: importError } = await supabase
      .from("imports")
      .insert({
        user_id: user.id,
        roster_id: roster.id,
        filename: sourceName,
        file_type: sourceType,
        file_size_bytes: sourceSize,
        status: "ready_for_review",
        date_start: dateStart,
        date_end: dateEnd,
        row_count: duties.length,
        summary,
        comparison
      })
      .select("id")
      .single();

    if (importError) throw importError;

    await supabase.from("rosters").update({ source_import_id: importBatch.id }).eq("id", roster.id);

    const { error: dutiesError } = await supabase
      .from("duties")
      .insert(duties.map((duty) => toDutyInsert(user.id, roster.id, importBatch.id, duty)));

    if (dutiesError) throw dutiesError;

    if (conflicts.length) {
      const { error: conflictsError } = await supabase
        .from("conflict_logs")
        .insert(conflicts.map((conflict: RosterConflict) => toConflictInsert(user.id, importBatch.id, conflict)));

      if (conflictsError) throw conflictsError;
    }

    return NextResponse.json({
      ok: true,
      importId: importBatch.id,
      summary,
      comparison,
      warnings: extraction.warnings
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Roster import failed." },
      { status: 500 }
    );
  }
}
