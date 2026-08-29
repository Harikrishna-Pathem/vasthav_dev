import { PermissionsGuard } from '../src/auth/guards/permissions.guard.js';
import { Permission } from '../src/auth/decorators/permissions.decorator.js';
import { RolesGuard } from '../src/auth/guards/roles.guard.js';

describe('PermissionsGuard', () => {
  it('allows the ADMIN role to manage users', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue([Permission.UserManage]) } as never;
    const guard = new PermissionsGuard(reflector);
    const context = { getHandler: () => undefined, getClass: () => undefined, switchToHttp: () => ({ getRequest: () => ({ user: { role: 'ADMIN' } }) }) } as never;
    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects a USER role for user-management permission', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue([Permission.UserManage]) } as never;
    const guard = new PermissionsGuard(reflector);
    const context = { getHandler: () => undefined, getClass: () => undefined, switchToHttp: () => ({ getRequest: () => ({ user: { role: 'USER' } }) }) } as never;
    expect(() => guard.canActivate(context)).toThrow('Missing required permission');
  });

  it('rejects a SURVEYER role without an assigned permission', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue([Permission.UserRead]) } as never;
    const guard = new PermissionsGuard(reflector);
    const context = { getHandler: () => undefined, getClass: () => undefined, switchToHttp: () => ({ getRequest: () => ({ user: { role: 'SURVEYER' } }) }) } as never;
    expect(() => guard.canActivate(context)).toThrow('Missing required permission');
  });
});

describe('RolesGuard', () => {
  it('allows ADMIN access when the role is explicitly permitted', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['ADMIN']) } as never;
    const guard = new RolesGuard(reflector);
    const context = { getHandler: () => undefined, getClass: () => undefined, switchToHttp: () => ({ getRequest: () => ({ user: { role: 'ADMIN' } }) }) } as never;
    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects USER access for ADMIN-only routes', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['ADMIN']) } as never;
    const guard = new RolesGuard(reflector);
    const context = { getHandler: () => undefined, getClass: () => undefined, switchToHttp: () => ({ getRequest: () => ({ user: { role: 'USER' } }) }) } as never;
    expect(() => guard.canActivate(context)).toThrow('Insufficient role');
  });
});
