export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterRequestData {
  email: string;
  username: string;
  password: string;
}

export interface RegisterResponse {
  id: string;
  email: string;
  username: string;
  role: string;
  is_active: boolean;
  is_superuser: boolean;
  is_verified: boolean;
}

export class AuthService {
  // fastapi-users提供的认证接口
  // Using JWT+cookie auth logic

  async register(form: RegisterRequestData): Promise<RegisterResponse> {
    const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
    });

    if (!response.ok) {
        throw new Error(`Registration failed: ${response.statusText}`);
    }

    return response.json();
  }

  async login(form: LoginForm): Promise<void> {
    // post form to backend
    const formData = new FormData();
    // fastapi-users expects 'username' field, but know there is another field 'username'
    formData.append('username', form.email);
    formData.append('password', form.password);

    const response = await fetch('/api/auth/cookie/login', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.statusText}`);
    }

    // On success, the JWT token is set in an HttpOnly cookie by the backend
  }

  async logout(): Promise<void> {
    const response = await fetch('/api/auth/cookie/logout', {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Logout failed: ${response.statusText}`);
    }

    // On success, the JWT token cookie is cleared by the backend
  }

  async gettUserMe(): Promise<RegisterResponse> {
    const response = await fetch('/api/users/me', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user info: ${response.statusText}`);
    }

    return response.json();
  }
}

export const authService = new AuthService();
