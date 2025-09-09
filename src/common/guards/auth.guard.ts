import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { FirebaseConfigService } from '../../config/firebase.config';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private firebaseConfig: FirebaseConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token no proporcionado');
    }

    try {
      const decodedToken = await this.firebaseConfig.auth.verifyIdToken(token);
      
      // Obtener datos adicionales del usuario desde Firestore
      const userDoc = await this.firebaseConfig.firestore
        .collection('users')
        .doc(decodedToken.uid)
        .get();

      if (!userDoc.exists) {
        throw new UnauthorizedException('Usuario no encontrado');
      }

      const userData = userDoc.data();
      request.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        ...userData,
      };

      return true;
    } catch (error) {
      throw new UnauthorizedException('Token inválido');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}