import { z } from "zod";

export const csvRowSchema = z.object({
  reg_no: z.preprocess(
    (v) => (v === null || v === undefined ? "" : String(v).trim()),
    z.string().min(1, "Registration number is required")
  ),
  name: z.string().trim().min(1, "Name is required").max(120),
  father_name: z.string().trim().max(120).default(""),
});
export type CSVStudentRow = z.infer<typeof csvRowSchema>;

export const bulkStudentImportSchema = z.array(csvRowSchema).min(1);

export const attendanceSubmissionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  absenteeIds: z.array(z.string()),
});
export type AttendanceBatchSubmission = z.infer<
  typeof attendanceSubmissionSchema
>;

export const classFormSchema = z.object({
  class_name: z.string().trim().min(1, "Class name is required").max(80),
  teacher_id: z.string().uuid().nullable().optional(),
});

export const studentFormSchema = z.object({
  reg_no: z.string().trim().min(1),
  name: z.string().trim().min(1).max(120),
  father_name: z.string().trim().max(120).default(""),
});
