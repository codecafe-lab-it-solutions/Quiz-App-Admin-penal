import { z } from "zod";

export const facultyCreateSchema = z.object({
  roll: z.string().trim().min(1, "Roll is required"),
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const studentCreateSchema = z.object({
  roll: z.string().trim().min(1, "Roll is required"),
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  major: z.string().trim().min(1, "Major is required"),
  batch: z.string().trim().min(1, "Batch is required"),
  semNow: z.string().trim().min(1, "Semester is required"),
});

export const facultyUpdateSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").optional(),
  email: z.string().trim().email("Enter a valid email").optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
});

export const studentUpdateSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").optional(),
  email: z.string().trim().email("Enter a valid email").optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  major: z.string().trim().min(1, "Major is required").optional(),
  batch: z.string().trim().min(1, "Batch is required").optional(),
  semNow: z.string().trim().min(1, "Semester is required").optional(),
});

export const facultyCourseMappingCreateSchema = z.object({
  facRoll: z.string().trim().min(1, "Faculty roll is required"),
  subCode: z.string().trim().min(1, "Course code is required"),
  branch: z.string().trim().min(1, "Branch is required"),
  sem: z.string().trim().min(1, "Semester is required"),
});

export const studentCourseMappingCreateSchema = z.object({
  roll: z.string().trim().min(1, "Student roll is required"),
  subCode: z.string().trim().min(1, "Course code is required"),
});
