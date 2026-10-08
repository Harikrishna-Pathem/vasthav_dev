import { PermissionsGuard } from '../src/auth/guards/permissions.guard.js';
import { Permission } from '../src/auth/decorators/permissions.decorator.js';
import { RolesGuard } from '../src/auth/guards/roles.guard.js';

describe('PermissionsGuard', () => {
  it('allows the ADMIN role to manage users', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue([Permission.UserManage]) } as never;
    const guard = new PermissionsGuard(reflector);
    const context = { getHandler: () => undefined, getClass: () => undefined, switchToHttp: () => ({ getRequest: () => ({ user: { actualRole: 'ADMIN', activeRole: 'ADMIN' } }) }) } as never;
    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects a USER role for user-management permission', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue([Permission.UserManage]) } as never;
    const guard = new PermissionsGuard(reflector);
    const context = { getHandler: () => undefined, getClass: () => undefined, switchToHttp: () => ({ getRequest: () => ({ user: { actualRole: 'USER', activeRole: 'USER' } }) }) } as never;
    expect(() => guard.canActivate(context)).toThrow('Missing required permission');
  });

  it('rejects a SURVEYER role without an assigned permission', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue([Permission.UserRead]) } as never;
    const guard = new PermissionsGuard(reflector);
    const context = { getHandler: () => undefined, getClass: () => undefined, switchToHttp: () => ({ getRequest: () => ({ user: { actualRole: 'SURVEYER', activeRole: 'SURVEYER' } }) }) } as never;
    expect(() => guard.canActivate(context)).toThrow('Missing required permission');
  });

  it('uses the selected active role instead of the highest database role', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue([Permission.UserManage]) } as never;
    const guard = new PermissionsGuard(reflector);
    const context = { getHandler: () => undefined, getClass: () => undefined, switchToHttp: () => ({ getRequest: () => ({ user: { actualRole: 'ADMIN', activeRole: 'USER' } }) }) } as never;
    expect(() => guard.canActivate(context)).toThrow('Missing required permission');
  });
});

describe('RolesGuard', () => {
  it('allows ADMIN access when the role is explicitly permitted', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['ADMIN']) } as never;
    const guard = new RolesGuard(reflector);
    const context = { getHandler: () => undefined, getClass: () => undefined, switchToHttp: () => ({ getRequest: () => ({ user: { actualRole: 'ADMIN', activeRole: 'ADMIN' } }) }) } as never;
    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects USER access for ADMIN-only routes', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['ADMIN']) } as never;
    const guard = new RolesGuard(reflector);
    const context = { getHandler: () => undefined, getClass: () => undefined, switchToHttp: () => ({ getRequest: () => ({ user: { actualRole: 'USER', activeRole: 'USER' } }) }) } as never;
    expect(() => guard.canActivate(context)).toThrow('Insufficient role');
  });

  it('does not grant an ADMIN route when an ADMIN session is active as USER', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['ADMIN']) } as never;
    const guard = new RolesGuard(reflector);
    const context = { getHandler: () => undefined, getClass: () => undefined, switchToHttp: () => ({ getRequest: () => ({ user: { actualRole: 'ADMIN', activeRole: 'USER' } }) }) } as never;
    expect(() => guard.canActivate(context)).toThrow('Insufficient role');
  });
});
