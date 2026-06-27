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
import { Loader2, Plus, Pencil, FileText, Upload, X } from "lucide-react";

const schema = z.object({
  employee_code: z.string().trim().min(1, "Required").max(40),
  full_name: z.string().trim().min(1, "Required").max(120),
  email: z.string().trim().email().max(160).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  position: z.string().trim().max(80).optional().or(z.literal("")),
  department: z.string().trim().max(80).optional().or(z.literal("")),
  company: z.string().trim().max(120).optional().or(z.literal("")),
  joining_date: z.string().min(1, "Required"),
  base_salary: z.coerce.number().min(0).max(100000000),
  bank_name: z.string().trim().max(120).optional().or(z.literal("")),
  bank_account_holder: z.string().trim().max(120).optional().or(z.literal("")),
  bank_account_number: z.string().trim().max(60).optional().or(z.literal("")),
  bank_ifsc: z.string().trim().max(30).optional().or(z.literal("")),
  status: z.enum(["active", "inactive"]),
  notes: z.string().max(500).optional().or(z.literal("")),
  aadhaar_url: z.string().optional().or(z.literal("")),
  pan_url: z.string().optional().or(z.literal("")),
  fitness_certificate_url: z.string().optional().or(z.literal("")),
  police_verification_urls: z.array(z.string()).optional(),
  vendor: z.string().trim().max(120).optional().or(z.literal("")),
  vendor_commission: z.coerce.number().min(0).max(100000000).optional().or(z.literal(0)),
});

export type EmployeeFormValues = z.infer<typeof schema>;

export interface EmployeeRow extends EmployeeFormValues {
  id: string;
}

async function uploadDoc(file: File, userId: string, kind: "aadhaar" | "pan" | "fitness" | "police"): Promise<string> {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${userId}/${kind}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("employee-docs").upload(path, file, { upsert: true });
  if (error) throw error;
  return path;
}

export function EmployeeDialog({ employee, trigger }: { employee?: EmployeeRow; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [panFile, setPanFile] = useState<File | null>(null);
  const [fitnessFile, setFitnessFile] = useState<File | null>(null);
  const [policeFiles, setPoliceFiles] = useState<File[]>([]);
  const qc = useQueryClient();
  const isEdit = !!employee;

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(schema),
    defaultValues: employee ?? {
      employee_code: "",
      full_name: "",
      email: "",
      phone: "",
      position: "",
      department: "",
      company: "",
      joining_date: new Date().toISOString().slice(0, 10),
      base_salary: 0,
      bank_name: "",
      bank_account_holder: "",
      bank_account_number: "",
      bank_ifsc: "",
      status: "active",
      notes: "",
      aadhaar_url: "",
      pan_url: "",
      fitness_certificate_url: "",
      police_verification_urls: [],
      vendor: "",
      vendor_commission: 0,
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: EmployeeFormValues) => {
      const { data: userData } = await supabase.auth.getUser();
      const owner_id = userData.user?.id;
      if (!owner_id) throw new Error("Not signed in");

      let aadhaar_url = values.aadhaar_url || "";
      let pan_url = values.pan_url || "";
      let fitness_certificate_url = values.fitness_certificate_url || "";
      let police_verification_urls = values.police_verification_urls ?? [];
      if (aadhaarFile) aadhaar_url = await uploadDoc(aadhaarFile, owner_id, "aadhaar");
      if (panFile) pan_url = await uploadDoc(panFile, owner_id, "pan");
      if (fitnessFile) fitness_certificate_url = await uploadDoc(fitnessFile, owner_id, "fitness");
      if (policeFiles.length) {
        const uploaded = await Promise.all(policeFiles.map((f) => uploadDoc(f, owner_id, "police")));
        police_verification_urls = [...police_verification_urls, ...uploaded];
      }

      const payload = { ...values, aadhaar_url, pan_url, fitness_certificate_url, police_verification_urls, owner_id };
      if (isEdit) {
        const { error } = await supabase.from("employees").update(payload).eq("id", employee!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("employees").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Employee updated" : "Employee added");
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false);
      setAadhaarFile(null);
      setPanFile(null);
      setFitnessFile(null);
      setPoliceFiles([]);
      if (!isEdit) form.reset();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>{isEdit ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}{isEdit ? "Edit" : "Add employee"}</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit employee" : "Add employee"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="grid gap-4 sm:grid-cols-2">
          <Field label="Employee ID *" error={form.formState.errors.employee_code?.message}>
            <Input {...form.register("employee_code")} placeholder="EMP-001" />
          </Field>
          <Field label="Full name *" error={form.formState.errors.full_name?.message}>
            <Input {...form.register("full_name")} />
          </Field>
          <Field label="Email"><Input type="email" {...form.register("email")} /></Field>
          <Field label="Phone"><Input {...form.register("phone")} /></Field>
          <Field label="Position"><Input {...form.register("position")} /></Field>
          <Field label="Department"><Input {...form.register("department")} /></Field>
          <div className="sm:col-span-2">
            <Field label="Company"><Input {...form.register("company")} placeholder="Company the employee works at" /></Field>
          </div>
          <Field label="Vendor"><Input {...form.register("vendor")} placeholder="Vendor / recruiter name" /></Field>
          <Field label="Vendor commission"><Input type="number" step="0.01" {...form.register("vendor_commission")} placeholder="Commission amount" /></Field>
          <Field label="Joining date *" error={form.formState.errors.joining_date?.message}>
            <Input type="date" {...form.register("joining_date")} />
          </Field>
          <Field label="Base salary (monthly) *" error={form.formState.errors.base_salary?.message}>
            <Input type="number" step="0.01" {...form.register("base_salary")} />
          </Field>

          <div className="sm:col-span-2 mt-2 border-t pt-3 text-sm font-medium text-muted-foreground">Bank details</div>
          <Field label="Bank name"><Input {...form.register("bank_name")} /></Field>
          <Field label="Account holder"><Input {...form.register("bank_account_holder")} /></Field>
          <Field label="Account number"><Input {...form.register("bank_account_number")} /></Field>
          <Field label="IFSC / Routing"><Input {...form.register("bank_ifsc")} /></Field>

          <div className="sm:col-span-2 mt-2 border-t pt-3 text-sm font-medium text-muted-foreground">Documents (PDF or image)</div>
          <DocField
            label="Aadhaar card"
            existing={form.watch("aadhaar_url")}
            file={aadhaarFile}
            onFile={setAadhaarFile}
            onClear={() => { setAadhaarFile(null); form.setValue("aadhaar_url", ""); }}
          />
          <DocField
            label="PAN card"
            existing={form.watch("pan_url")}
            file={panFile}
            onFile={setPanFile}
            onClear={() => { setPanFile(null); form.setValue("pan_url", ""); }}
          />
          <DocField
            label="Fitness certificate"
            existing={form.watch("fitness_certificate_url")}
            file={fitnessFile}
            onFile={setFitnessFile}
            onClear={() => { setFitnessFile(null); form.setValue("fitness_certificate_url", ""); }}
          />
          <MultiDocField
            label="Police verification"
            existing={form.watch("police_verification_urls") ?? []}
            files={policeFiles}
            onFiles={setPoliceFiles}
            onRemoveExisting={(idx) => {
              const cur = form.getValues("police_verification_urls") ?? [];
              form.setValue("police_verification_urls", cur.filter((_, i) => i !== idx));
            }}
          />

          <div className="sm:col-span-2">
            <Field label="Status">
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" {...form.register("status")}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Notes"><Textarea rows={2} {...form.register("notes")} /></Field>
          </div>

          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Save changes" : "Add employee"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DocField({ label, existing, file, onFile, onClear }: { label: string; existing?: string; file: File | null; onFile: (f: File | null) => void; onClear: () => void }) {
  const [viewing, setViewing] = useState(false);
  async function view() {
    if (!existing) return;
    setViewing(true);
    const { data, error } = await supabase.storage.from("employee-docs").createSignedUrl(existing, 60);
    setViewing(false);
    if (error || !data) { toast.error(error?.message ?? "Could not open file"); return; }
    window.open(data.signedUrl, "_blank");
  }
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <label className="inline-flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-input bg-background px-3 text-sm text-muted-foreground hover:bg-secondary">
          <Upload className="h-4 w-4 shrink-0" />
          <span className="truncate">{file ? file.name : "Choose file"}</span>
          <input type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
        </label>
        {existing && !file && (
          <Button type="button" variant="outline" size="sm" onClick={view} disabled={viewing}>
            <FileText className="mr-1 h-4 w-4" /> View
          </Button>
        )}
        {(file || existing) && (
          <Button type="button" variant="ghost" size="icon" onClick={onClear}><X className="h-4 w-4" /></Button>
        )}
      </div>
    </div>
  );
}

function MultiDocField({ label, existing, files, onFiles, onRemoveExisting }: { label: string; existing: string[]; files: File[]; onFiles: (f: File[]) => void; onRemoveExisting: (idx: number) => void }) {
  const [busyIdx, setBusyIdx] = useState<number | null>(null);
  async function viewAt(idx: number) {
    setBusyIdx(idx);
    const { data, error } = await supabase.storage.from("employee-docs").createSignedUrl(existing[idx], 60);
    setBusyIdx(null);
    if (error || !data) { toast.error(error?.message ?? "Could not open file"); return; }
    window.open(data.signedUrl, "_blank");
  }
  const folderProps = { webkitdirectory: "", directory: "" } as unknown as Record<string, string>;
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex h-10 min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-dashed border-input bg-background px-2 text-sm text-muted-foreground hover:bg-secondary">
          <Upload className="h-4 w-4 shrink-0" />
          <span className="truncate">Add files</span>
          <input type="file" multiple accept="application/pdf,image/*" className="hidden"
            onChange={(e) => { onFiles([...files, ...Array.from(e.target.files ?? [])]); e.target.value = ""; }} />
        </label>
        <label className="inline-flex h-10 min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-dashed border-input bg-background px-2 text-sm text-muted-foreground hover:bg-secondary">
          <Upload className="h-4 w-4 shrink-0" />
          <span className="truncate">Add folder</span>
          <input type="file" multiple className="hidden" {...folderProps}
            onChange={(e) => { onFiles([...files, ...Array.from(e.target.files ?? [])]); e.target.value = ""; }} />
        </label>
      </div>
      {(existing.length > 0 || files.length > 0) && (
        <ul className="mt-2 space-y-1 text-xs">
          {existing.map((path, idx) => (
            <li key={`e-${idx}`} className="flex items-center justify-between rounded-md border border-border bg-secondary/30 px-2 py-1">
              <span className="truncate">{path.split("/").pop()}</span>
              <div className="flex items-center gap-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => viewAt(idx)} disabled={busyIdx === idx}>
                  <FileText className="mr-1 h-3 w-3" /> View
                </Button>
                <Button type="button" variant="ghost" size="icon" onClick={() => onRemoveExisting(idx)}><X className="h-3 w-3" /></Button>
              </div>
            </li>
          ))}
          {files.map((f, idx) => (
            <li key={`n-${idx}`} className="flex items-center justify-between rounded-md border border-dashed border-border px-2 py-1">
              <span className="truncate">{f.name} <span className="text-muted-foreground">(new)</span></span>
              <Button type="button" variant="ghost" size="icon" onClick={() => onFiles(files.filter((_, i) => i !== idx))}><X className="h-3 w-3" /></Button>
            </li>
          ))}
        </ul>
      )}
    </div>
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
