import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Upload, X, FileText } from "lucide-react";

const schema = z.object({
  full_name: z.string().trim().min(1, "Required").max(120),
  description: z.string().max(1000).optional().or(z.literal("")),
  job_role: z.string().trim().max(120).optional().or(z.literal("")),
  current_salary: z.coerce.number().min(0).max(100000000),
  expected_salary: z.coerce.number().min(0).max(100000000),
  current_location: z.string().trim().max(120).optional().or(z.literal("")),
  preferred_locations_text: z.string().max(500).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  email: z.string().trim().email().max(160).optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
});
type FormValues = z.infer<typeof schema>;

export interface CandidateRow {
  id: string;
  full_name: string;
  description: string | null;
  job_role: string | null;
  current_salary: number;
  expected_salary: number;
  current_location: string | null;
  preferred_locations: string[];
  resume_url: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
}

export function CandidateDialog({ candidate, trigger }: { candidate?: CandidateRow; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumePath, setResumePath] = useState<string>(candidate?.resume_url ?? "");
  const qc = useQueryClient();
  const isEdit = !!candidate;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: candidate ? {
      full_name: candidate.full_name,
      description: candidate.description ?? "",
      job_role: candidate.job_role ?? "",
      current_salary: candidate.current_salary,
      expected_salary: candidate.expected_salary,
      current_location: candidate.current_location ?? "",
      preferred_locations_text: (candidate.preferred_locations ?? []).join(", "),
      phone: candidate.phone ?? "",
      email: candidate.email ?? "",
      notes: candidate.notes ?? "",
    } : {
      full_name: "", description: "", job_role: "", current_salary: 0, expected_salary: 0,
      current_location: "", preferred_locations_text: "", phone: "", email: "", notes: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const { data: userData } = await supabase.auth.getUser();
      const owner_id = userData.user?.id;
      if (!owner_id) throw new Error("Not signed in");

      let resume_url = resumePath || null;
      if (resumeFile) {
        const ext = resumeFile.name.split(".").pop() || "bin";
        const path = `${owner_id}/resume-${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("candidate-resumes").upload(path, resumeFile, { upsert: true });
        if (error) throw error;
        resume_url = path;
      }

      const preferred_locations = (values.preferred_locations_text || "")
        .split(",").map((s) => s.trim()).filter(Boolean);

      const payload = {
        owner_id,
        full_name: values.full_name,
        description: values.description || null,
        job_role: values.job_role || null,
        current_salary: values.current_salary,
        expected_salary: values.expected_salary,
        current_location: values.current_location || null,
        preferred_locations,
        phone: values.phone || null,
        email: values.email || null,
        notes: values.notes || null,
        resume_url,
      };

      if (isEdit) {
        const { error } = await supabase.from("candidates").update(payload).eq("id", candidate!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("candidates").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Candidate updated" : "Candidate added");
      qc.invalidateQueries({ queryKey: ["candidates"] });
      setOpen(false);
      setResumeFile(null);
      if (!isEdit) { form.reset(); setResumePath(""); }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function viewResume() {
    if (!resumePath) return;
    const { data, error } = await supabase.storage.from("candidate-resumes").createSignedUrl(resumePath, 60);
    if (error || !data) { toast.error(error?.message ?? "Could not open"); return; }
    window.open(data.signedUrl, "_blank");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>{isEdit ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}{isEdit ? "Edit" : "Add candidate"}</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit candidate" : "Add candidate"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name *" error={form.formState.errors.full_name?.message}>
            <Input {...form.register("full_name")} />
          </Field>
          <Field label="Job role"><Input {...form.register("job_role")} placeholder="e.g. Frontend Developer" /></Field>
          <Field label="Current salary"><Input type="number" step="0.01" {...form.register("current_salary")} /></Field>
          <Field label="Expected salary"><Input type="number" step="0.01" {...form.register("expected_salary")} /></Field>
          <Field label="Current location"><Input {...form.register("current_location")} placeholder="e.g. Mumbai" /></Field>
          <Field label="Willing to relocate to">
            <Input {...form.register("preferred_locations_text")} placeholder="Bengaluru, Pune, Remote" />
          </Field>
          <Field label="Phone"><Input {...form.register("phone")} /></Field>
          <Field label="Email"><Input type="email" {...form.register("email")} /></Field>

          <div className="sm:col-span-2">
            <Field label="Description"><Textarea rows={3} {...form.register("description")} placeholder="Skills, experience, summary…" /></Field>
          </div>

          <div className="sm:col-span-2">
            <Label className="text-xs">Resume (optional, PDF or image)</Label>
            <div className="mt-1.5 flex items-center gap-2">
              <label className="inline-flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-input bg-background px-3 text-sm text-muted-foreground hover:bg-secondary">
                <Upload className="h-4 w-4" />
                {resumeFile ? resumeFile.name : "Choose file"}
                <input type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)} />
              </label>
              {resumePath && !resumeFile && (
                <Button type="button" variant="outline" size="sm" onClick={viewResume}><FileText className="mr-1 h-4 w-4" /> View</Button>
              )}
              {(resumeFile || resumePath) && (
                <Button type="button" variant="ghost" size="icon" onClick={() => { setResumeFile(null); setResumePath(""); }}><X className="h-4 w-4" /></Button>
              )}
            </div>
          </div>

          <div className="sm:col-span-2">
            <Field label="Notes"><Textarea rows={2} {...form.register("notes")} /></Field>
          </div>

          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Save changes" : "Add candidate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
