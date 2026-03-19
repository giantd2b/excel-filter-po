import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Serve frontend static files
  const publicPath = join(__dirname, 'public');
  const express = require('express');
  const fs = require('fs');

  if (fs.existsSync(publicPath)) {
    console.log(`Serving frontend from: ${publicPath}`);
    app.use(express.static(publicPath));

    // SPA fallback — serve index.html for all non-API routes
    app.use((req: any, res: any, next: any) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/inbox') || req.path.startsWith('/socket.io')) {
        return next();
      }
      res.sendFile(join(publicPath, 'index.html'));
    });
  } else {
    console.log(`No frontend found at: ${publicPath}`);
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`API server running on http://localhost:${port}`);
}
bootstrap();
