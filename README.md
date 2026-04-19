# 🍳 Sistema de Control de Cocina - Versión Profesional

Sistema completo de gestión de cocina desarrollado en **Node.js** con las siguientes capacidades:

- 📋 Gestión de catálogo de productos
- 📦 Control de inventario y compras
- 🍽️ Administración de recetas con cálculo de costos
- 👨‍🍳 Control de producción con descuento automático de inventario
- 📈 Reportes y análisis de rentabilidad
- 👥 Sistema de usuarios con roles y auditoría

## 🚀 Características Principales

### ✅ Gestión de Usuarios Mejorada
- 3 roles: Administrador, Supervisor, Cocinero
- Bloqueo automático tras 5 intentos fallidos (15 minutos)
- Auditoría completa de todas las acciones
- Sesiones seguras con expiración automática

### ✅ Control de Inventario Inteligente
- Registro de compras por factura
- Recalculo automático de costos promedio ponderados
- Alertas de stock mínimo
- Historial completo de movimientos

### ✅ Sistema de Recetas Profesional
- Cálculo automático de costos por plato
- Márgenes de utilidad configurables
- Análisis de rentabilidad
- Recetas con ingredientes ilimitados

### ✅ Producción con Trazabilidad
- Validación de stock antes de producir
- Descuento automático de ingredientes
- Historial con posibilidad de reversión
- Generación de IDs únicos por operación

## 📋 Requisitos

- **Node.js** v18 o superior
- **npm** v9 o superior
- Sistema operativo: Windows, macOS o Linux

## 🔧 Instalación

### 1. Descargar el Sistema

Copiá la carpeta `sistema-cocina` a tu computadora.

### 2. Instalar Dependencias

Abrí una terminal en la carpeta del proyecto y ejecutá:

```bash
npm install
```

### 3. Iniciar el Servidor

```bash
npm start
```

El sistema estará disponible en: **http://localhost:3000**

## 👤 Acceso Inicial

### Credenciales por Defecto

- **Usuario:** `admin`
- **Contraseña:** `admin123`

⚠️ **IMPORTANTE:** Cambiá la contraseña del administrador después del primer acceso.

## 📁 Estructura del Proyecto

```
sistema-cocina/
├── server.js              # Servidor principal
├── package.json           # Configuración de dependencias
├── .env                   # Variables de entorno
├── data/                  # Base de datos JSON
│   ├── usuarios.json
│   ├── catalogo.json
│   ├── inventario.json
│   ├── historial.json
│   ├── recetas.json
│   ├── produccion.json
│   └── auditoria.json
├── public/                # Archivos estáticos
│   ├── css/
│   │   └── styles.css
│   └── js/
│       ├── main.js
│       └── catalogo.js
└── views/                 # Plantillas EJS
    ├── login.ejs
    ├── dashboard.ejs
    ├── catalogo.ejs
    ├── inventario.ejs
    ├── recetas.ejs
    ├── produccion.ejs
    ├── reportes.ejs
    └── partials/
        └── sidebar.ejs
```

## 🎯 Módulos del Sistema

### 1. Dashboard
- Métricas generales del sistema
- Valor total del inventario
- Stock bajo
- Últimas producciones

### 2. Catálogo
- Crear artículos maestros
- Modificar productos existentes
- Gestión de unidades de medida

### 3. Inventario y Compras
- Registrar facturas de compra
- Actualización automática de stock
- Historial de compras por proveedor

### 4. Recetas
- Crear recetas con ingredientes
- Cálculo automático de costos
- Configurar márgenes de utilidad
- Precio de venta sugerido

### 5. Producción
- Procesar platos con validación de stock
- Descuento automático de inventario
- Historial con reversión
- Generación de IDs de operación

### 6. Reportes
- Stock bajo (alertas automáticas)
- Recetas más rentables
- Valor total del inventario
- Análisis de márgenes

## 🔒 Seguridad

### Características de Seguridad Implementadas

1. **Autenticación robusta**
   - Contraseñas hasheadas con bcrypt
   - Sesiones con expiración automática (8 horas)

2. **Protección contra ataques**
   - Bloqueo automático tras intentos fallidos
   - Validación de entrada en todos los formularios
   - Protección CSRF en formularios

3. **Auditoría completa**
   - Registro de todas las acciones importantes
   - Tracking de IP y timestamp
   - Historial de accesos

## 📊 Base de Datos

El sistema utiliza **archivos JSON** para almacenamiento:

- ✅ Fácil de migrar y respaldar
- ✅ No requiere instalación de base de datos
- ✅ Portátil entre sistemas

### Backup de Datos

Para respaldar tu información:

```bash
# Copiá la carpeta data/
cp -r data/ backup-$(date +%Y%m%d)/
```

## 🌐 Despliegue en Producción

### Hosting Recomendado para Honduras

1. **Heroku** (Gratis/Básico)
2. **Railway.app** ($5-10/mes)
3. **VPS Digital Ocean** ($5/mes)
4. **Hosting compartido con Node.js** (~$3-8/mes)

### Pasos para Deploy

1. Subí el código a GitHub
2. Conectá tu repositorio con el hosting
3. Configurá las variables de entorno
4. Iniciá el servidor con `npm start`

## 🛠️ Configuración Avanzada

### Variables de Entorno (.env)

```env
PORT=3000
SESSION_SECRET=cambiar-esto-por-algo-muy-secreto
NODE_ENV=production
```

### Personalización

- **Colores:** Editá `public/css/styles.css` (variables CSS)
- **Logo:** Agregá tu logo en la carpeta `public/images/`
- **Textos:** Modificá las plantillas en `views/`

## 📱 Compatibilidad

- ✅ Navegadores modernos (Chrome, Firefox, Safari, Edge)
- ✅ Diseño responsive (funciona en móvil/tablet)
- ✅ Compatible con Windows, macOS y Linux

## 🆘 Soporte

### Problemas Comunes

**El servidor no inicia:**
```bash
# Verificá que Node.js esté instalado
node --version

# Reinstalá dependencias
rm -rf node_modules package-lock.json
npm install
```

**Puerto 3000 ocupado:**
```bash
# Cambiá el puerto en .env
PORT=3001
```

**Error de permisos:**
```bash
# En Linux/Mac, ejecutá con permisos
sudo npm start
```

## 📝 Notas para el Docente

Este sistema fue diseñado con fines educativos y puede ser utilizado para:

- ✅ Enseñar Node.js y Express
- ✅ Prácticas de bases de datos
- ✅ Ejemplos de autenticación
- ✅ Gestión de sesiones
- ✅ Arquitectura MVC

## 📄 Licencia

Este proyecto es de código abierto y puede ser usado libremente para fines educativos.

## 🇭🇳 Hecho en Honduras

Desarrollado con ❤️ para el Instituto Tecnológico Santo Tomás

---

**Versión:** 2.0.0  
**Fecha:** Abril 2026  
**Tecnologías:** Node.js, Express, EJS, bcrypt, JSON Database
