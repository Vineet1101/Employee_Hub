import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { currency } from "@/lib/format";
import { CandidateDialog, type CandidateRow } from "@/components/CandidateDialog";
import { ListPagination, pageRange, type PageSize } from "@/components/ListPagination";
import { applyCandidateFilters, type CandidateFilters } from "@/lib/candidates-query";
import { usePaginationState } from "@/lib/pagination-state";
import { Trash2, Search, UserSearch, FileText, MapPin, MessageSquare, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { sendBulkWhatsapp } from "@/lib/whatsapp.functions";

export const Route = createFileRoute("/_authenticated/candidates")({
  component: CandidatesPage,
});

function useDebouncedFilters(filters: CandidateFilters, delay = 300) {
  const [debounced, setDebounced] = useState(filters);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(filters), delay);
    return () => clearTimeout(t);
  }, [filters, delay]);
  return debounced;
}

function CandidatesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [minCurrent, setMinCurrent] = useState("");
  const [maxCurrent, setMaxCurrent] = useState("");
  const [minExpected, setMinExpected] = useState("");
  const [maxExpected, setMaxExpected] = useState("");
  const [location, setLocation] = useState("");
  const { page, setPage, pageSize, setPageSize } = usePaginationState();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [waOpen, setWaOpen] = useState(false);

  const filters: CandidateFilters = useMemo(
    () => ({ search, jobRole, location, minCurrent, maxCurrent, minExpected, maxExpected }),
    [search, jobRole, location, minCurrent, maxCurrent, minExpected, maxExpected],
  );
  const debouncedFilters = useDebouncedFilters(filters);

  useEffect(() => {
    setPage(1);
  }, [debouncedFilters, setPage]);

  const { data, isLoading } = useQuery({
    queryKey: ["candidates", page, pageSize, debouncedFilters],
    queryFn: async () => {
      const { from, to } = pageRange(page, pageSize);
      let query = supabase
        .from("candidates")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });
      query = applyCandidateFilters(query, debouncedFilters);
      const { data: rows, error, count } = await query.range(from, to);
      if (error) throw error;
      return { rows: (rows ?? []) as CandidateRow[], total: count ?? 0 };
    },
  });

  const candidates = data?.rows ?? [];
  const total = data?.total ?? 0;

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("candidates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Candidate removed");
      qc.invalidateQueries({ queryKey: ["candidates"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function clearFilters() {
    setSearch("");
    setJobRole("");
    setMinCurrent("");
    setMaxCurrent("");
    setMinExpected("");
    setMaxExpected("");
    setLocation("");
  }

  async function openResume(path: string | null) {
    if (!path) return;
    const { data: signed, error } = await supabase.storage.from("candidate-resumes").createSignedUrl(path, 60);
    if (error || !signed) {
      toast.error(error?.message ?? "Could not open");
      return;
    }
    window.open(signed.signedUrl, "_blank");
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function selectAllFiltered() {
    let query = supabase.from("candidates").select("id");
    query = applyCandidateFilters(query, debouncedFilters);
    const { data: ids, error } = await query;
    if (error) {
      toast.error(error.message);
      return;
    }
    setSelected(new Set((ids ?? []).map((c) => c.id)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  return (
    <div className="px-6 py-8 md:px-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Candidate pool</h1>
          <p className="text-sm text-muted-foreground">Track potential hires and filter by role, salary and location.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setWaOpen(true)} disabled={selected.size === 0}>
            <MessageSquare className="mr-2 h-4 w-4" /> WhatsApp ({selected.size})
          </Button>
          <CandidateDialog />
        </div>
      </div>

      <div className="mt-6 grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="relative sm:col-span-2 lg:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search name, description, email…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Input placeholder="Job role" value={jobRole} onChange={(e) => setJobRole(e.target.value)} />
        <Input placeholder="Location (current or preferred)" value={location} onChange={(e) => setLocation(e.target.value)} />
        <div className="flex gap-2">
          <Input type="number" placeholder="Min current salary" value={minCurrent} onChange={(e) => setMinCurrent(e.target.value)} />
          <Input type="number" placeholder="Max current salary" value={maxCurrent} onChange={(e) => setMaxCurrent(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Input type="number" placeholder="Min expected salary" value={minExpected} onChange={(e) => setMinExpected(e.target.value)} />
          <Input type="number" placeholder="Max expected salary" value={maxExpected} onChange={(e) => setMaxExpected(e.target.value)} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 sm:col-span-2 lg:col-span-4">
          <span className="text-xs text-muted-foreground">{total} candidates · {selected.size} selected</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={selectAllFiltered}>Select all filtered</Button>
            {selected.size > 0 && <Button variant="ghost" size="sm" onClick={clearSelection}>Clear selection</Button>}
            <Button variant="ghost" size="sm" onClick={clearFilters}>Clear filters</Button>
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card" style={{ boxShadow: "var(--shadow-card)" }}>
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : candidates.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-12 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-secondary text-primary"><UserSearch className="h-5 w-5" /></div>
            <div>
              <h3 className="font-medium">{total === 0 && !debouncedFilters.search ? "No candidates yet" : "No matches"}</h3>
              <p className="text-sm text-muted-foreground">
                {total === 0 && !debouncedFilters.search ? "Add your first candidate to start building the pool." : "Try clearing some filters."}
              </p>
            </div>
            {total === 0 && !debouncedFilters.search && <CandidateDialog />}
          </div>
        ) : (
          <>
            <div className="grid gap-3 p-4">
              {candidates.map((c) => (
                <div key={c.id} className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggle(c.id)} className="mt-1" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-medium">{c.full_name}</h3>
                          {c.job_role && <Badge variant="secondary">{c.job_role}</Badge>}
                        </div>
                        {(c.email || c.phone) && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {[c.email, c.phone].filter(Boolean).join(" · ")}
                          </p>
                        )}
                        {c.description && <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{c.description}</p>}
                        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                          <span><span className="text-muted-foreground">Current:</span> <span className="tabular-nums">{currency(c.current_salary)}</span></span>
                          <span><span className="text-muted-foreground">Expected:</span> <span className="tabular-nums">{currency(c.expected_salary)}</span></span>
                          {c.current_location && (
                            <span className="inline-flex items-center gap-1 text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{c.current_location}</span>
                          )}
                        </div>
                        {c.preferred_locations?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            <span className="text-xs text-muted-foreground">Open to:</span>
                            {c.preferred_locations.map((p) => (
                              <Badge key={p} variant="outline" className="text-xs">{p}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex gap-1">
                        {c.resume_url && (
                          <Button size="sm" variant="outline" onClick={() => openResume(c.resume_url)}>
                            <FileText className="mr-1 h-4 w-4" /> Resume
                          </Button>
                        )}
                        <CandidateDialog candidate={c} trigger={<Button size="sm" variant="ghost">Edit</Button>} />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove {c.full_name}?</AlertDialogTitle>
                              <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => del.mutate(c.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <ListPagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={(size: PageSize) => setPageSize(size)}
            />
          </>
        )}
      </div>

      <BulkWhatsappDialog
        open={waOpen}
        onOpenChange={setWaOpen}
        candidateIds={[...selected]}
        onSent={() => {
          setWaOpen(false);
          clearSelection();
        }}
      />
    </div>
  );
}

function BulkWhatsappDialog({
  open,
  onOpenChange,
  candidateIds,
  onSent,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  candidateIds: string[];
  onSent: () => void;
}) {
  const [message, setMessage] = useState("");
  const send = useServerFn(sendBulkWhatsapp);

  const mutation = useMutation({
    mutationFn: async () => send({ data: { candidateIds, message } }),
    onSuccess: (res) => {
      const r = res as { sent: number; failed: number; skipped: number };
      toast.success(`Sent ${r.sent} · Failed ${r.failed} · Skipped ${r.skipped}`);
      setMessage("");
      onSent();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send WhatsApp to {candidateIds.length} candidate{candidateIds.length === 1 ? "" : "s"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Textarea rows={6} placeholder="Type your message…" value={message} onChange={(e) => setMessage(e.target.value)} />
          <p className="text-xs text-muted-foreground">
            Make sure your provider is configured in{" "}
            <a href="/settings" className="underline">Settings</a>. Meta Cloud API requires approved templates outside the 24-hour window.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={!message.trim() || mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
