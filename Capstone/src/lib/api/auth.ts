import { request } from "./client";
import type { AuthUser, UserRole } from "../domain/types";

export const ROLE_LABELS: Record<UserRole, string> = {
  pharmacist: "Pharmacist",
  inventory_manager: "Inventory Manager",
  administrator: "Administrator",
};

interface DemoAccount {
  user: AuthUser;
  password: string;
}

const DEMO_USERS: Record<UserRole, DemoAccount> = {
  pharmacist: {
    user: {
      id: "USR-101",
      name: "Priya Nair",
      email: "priya.nair@greenpharm.example",
      role: "pharmacist",
      initials: "PN",
    },
    password: "pharma123",
  },

  inventory_manager: {
    user: {
      id: "USR-102",
      name: "Jordan Mensah",
      email: "jordan.mensah@greenpharm.example",
      role: "inventory_manager",
      initials: "JM",
    },
    password: "inventory123",
  },

  administrator: {
    user: {
      id: "USR-103",
      name: "Alina Frost",
      email: "alina.frost@greenpharm.example",
      role: "administrator",
      initials: "AF",
    },
    password: "admin123",
  },
};

export interface LoginPayload {
  identifier: string;
  password: string;
  role?: UserRole;
}

export function login(
  payload: LoginPayload,
): Promise<{ token: string; user: AuthUser }> {
  return request(
    "/auth/login",
    () => {
      const identifier = payload.identifier.trim().toLowerCase();
      const selectedRole = payload.role;

      if (!selectedRole) {
        throw new Error("Please select a role");
      }

      const account = DEMO_USERS[selectedRole];

      if (!account) {
        throw new Error("Invalid role");
      }

      // The email must match the selected role's account.
      if (identifier !== account.user.email.toLowerCase()) {
        throw new Error(
          `This email does not belong to the selected ${ROLE_LABELS[selectedRole]} account`,
        );
      }

      // The password must match the selected role's account.
      if (payload.password !== account.password) {
        throw new Error("Invalid email or password");
      }

      return {
        token: `demo-token.${selectedRole}.${Date.now()}`,
        user: { ...account.user },
      };
    },
    {
      method: "POST",
      body: payload,
    },
  );
}

export function requestPasswordReset(
  email: string,
): Promise<{ sent: boolean }> {
  return request(
    "/auth/forgot-password",
    () => {
      if (!email.includes("@")) {
        throw new Error("Enter a valid email address");
      }

      return { sent: true };
    },
    {
      method: "POST",
      body: { email },
    },
  );
}