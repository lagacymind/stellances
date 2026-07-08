import type { Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import type { RegisterDto } from './dto/register.dto';

class MockResponse {
  cookies: Array<{
    name: string;
    value: string;
    options: Record<string, unknown>;
  }> = [];
  cleared: Array<{ name: string; options: Record<string, unknown> }> = [];

  cookie(name: string, value: string, options: Record<string, unknown>): this {
    this.cookies.push({ name, value, options });
    return this;
  }

  clearCookie(name: string, options: Record<string, unknown>): this {
    this.cleared.push({ name, options });
    return this;
  }
}

describe('AuthController', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_REFRESH_DAYS = '30';
  });

  it('login() sets access_token + refresh_token cookies', async () => {
    const loginMock = jest.fn().mockResolvedValue({
      access_token: 'access',
      refresh_token: 'refresh',
    });
    const authService = { login: loginMock } as unknown as AuthService;

    const controller = new AuthController(authService);
    const res = new MockResponse();
    const req = {
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
      user: { id: 'u1', email: 'a@b.com', role: 'CLIENT', tokenVersion: 0 },
      cookies: {},
    };

    const body = await controller.login(
      req as Parameters<typeof controller.login>[0],
      res as unknown as Response,
    );

    expect(body.access_token).toBe('access');
    const cookie = res.cookies.find((c) => c.name === 'refresh_token');
    expect(cookie?.options).toMatchObject({
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      path: '/api/auth',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    expect(loginMock).toHaveBeenCalled();
  });

  it('register() returns access token and sets refresh_token cookie', async () => {
    const registerMock = jest.fn().mockResolvedValue({
      user: { id: 'u1', email: 'e', role: 'CLIENT' },
      access_token: 'access',
      refresh_token: 'refresh',
    });
    const authService = { register: registerMock } as unknown as AuthService;

    const controller = new AuthController(authService);
    const res = new MockResponse();
    const req = {
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
      cookies: {},
    };

    const body = await controller.register(
      { email: 'e', password: 'p', name: 'n' } as RegisterDto,
      req as Parameters<typeof controller.register>[1],
      res as unknown as Response,
    );

    expect(body.access_token).toBe('access');
    expect(res.cookies.find((c) => c.name === 'refresh_token')?.value).toBe(
      'refresh',
    );
    expect(registerMock).toHaveBeenCalled();
  });

  it('refresh() uses refresh_token cookie and sets rotated cookies', async () => {
    const refreshMock = jest.fn().mockResolvedValue({
      access_token: 'access2',
      refresh_token: 'refresh2',
    });
    const authService = { refresh: refreshMock } as unknown as AuthService;

    const controller = new AuthController(authService);
    const res = new MockResponse();
    const req = {
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
      cookies: { refresh_token: 'refresh1' },
    };

    const body = await controller.refresh(
      req as Parameters<typeof controller.refresh>[0],
      res as unknown as Response,
    );

    expect(body.access_token).toBe('access2');
    expect(refreshMock).toHaveBeenCalledWith('refresh1', expect.any(Object));
    expect(
      res.cookies.some(
        (c) => c.name === 'refresh_token' && c.value === 'refresh2',
      ),
    ).toBe(true);
  });

  it('logout() revokes refresh token and clears cookies', async () => {
    const revokeMock = jest.fn().mockResolvedValue(undefined);
    const authService = {
      revokeRefreshToken: revokeMock,
    } as unknown as AuthService;

    const controller = new AuthController(authService);
    const res = new MockResponse();
    const req = {
      ip: '127.0.0.1',
      headers: {},
      cookies: { refresh_token: 'refresh1' },
    };

    const body = await controller.logout(
      req as Parameters<typeof controller.logout>[0],
      res as unknown as Response,
    );

    expect(body.message).toContain('Logged out');
    expect(revokeMock).toHaveBeenCalledWith('refresh1');
    expect(res.cleared.some((c) => c.name === 'access_token')).toBe(true);
    expect(res.cleared.some((c) => c.name === 'refresh_token')).toBe(true);
  });

  it('logoutAll() revokes all refresh tokens and clears cookies', async () => {
    const logoutAllMock = jest.fn().mockResolvedValue(undefined);
    const authService = { logoutAll: logoutAllMock } as unknown as AuthService;

    const controller = new AuthController(authService);
    const res = new MockResponse();
    const req = {
      ip: '127.0.0.1',
      headers: {},
      cookies: {},
      user: { id: 'u1', email: 'a@b.com', role: 'CLIENT', tokenVersion: 0 },
    };

    const body = await controller.logoutAll(
      req as Parameters<typeof controller.logoutAll>[0],
      res as unknown as Response,
    );

    expect(body.message).toContain('everywhere');
    expect(logoutAllMock).toHaveBeenCalledWith('u1');
    expect(res.cleared.some((c) => c.name === 'access_token')).toBe(true);
    expect(res.cleared.some((c) => c.name === 'refresh_token')).toBe(true);
  });
});
