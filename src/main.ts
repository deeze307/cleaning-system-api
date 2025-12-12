import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // LOG PARA VERIFICAR VARIABLES DE ENTORNO
  console.log('🔍 Environment Check:');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('PORT:', process.env.PORT);
  console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID);
  console.log('FRONTEND_URL:', process.env.FRONTEND_URL);

  // Configuración global de validación
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Configuración de CORS - UNA SOLA VEZ
  app.enableCors({
    origin: '*', // Dejalo abierto por ahora para testing
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Configuración de Swagger
  const config = new DocumentBuilder()
    .setTitle('Sistema de Gestión de Limpieza API')
    .setDescription('API para gestión de limpieza de edificios y habitaciones')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  
  await app.listen(port, '0.0.0.0');
  
  console.log(`🚀 App corriendo en puerto ${port}`);
  console.log(`📚 Docs en /api/docs`);
  console.log(`🌍 Listening on 0.0.0.0:${port}`);
}
bootstrap();