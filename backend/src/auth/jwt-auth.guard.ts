import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const path =
      (request?.path ?? request?.url?.split?.('?')[0] ?? '').replace(/\/$/, '') || '/';
    const pathNorm = path.startsWith('/') ? path : `/${path}`;
    if (
      pathNorm === '/api' ||
      pathNorm.startsWith('/api/') ||
      pathNorm === '/api-json' ||
      pathNorm === '/api-yaml'
    ) {
      return true;
    }
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }
}
