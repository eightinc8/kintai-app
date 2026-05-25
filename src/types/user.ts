export type UserRole = "admin" | "staff";

export interface Staff {
  id: string;
  email: string;
  name: string;
  nameKana: string;
  role: UserRole;
  startMonth: string;
  address: string;
  phone: string;
  birthday: string;
  familyComposition: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
