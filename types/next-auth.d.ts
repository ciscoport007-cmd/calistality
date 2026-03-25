import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
      roleId?: string;
      department?: string;
      departmentId?: string;
      position?: string;
    };
  }

  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
    roleId?: string | null;
    department?: string;
    departmentId?: string | null;
    position?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role?: string;
    roleId?: string | null;
    department?: string;
    departmentId?: string | null;
    position?: string;
  }
}
