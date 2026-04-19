import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ==================================================
// CONFIGURACIÓN DE ALMACENAMIENTO (JSON)
// ==================================================
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Archivos de datos
const FILES = {
    usuarios: path.join(DATA_DIR, 'usuarios.json'),
    catalogo: path.join(DATA_DIR, 'catalogo.json'),
    inventario: path.join(DATA_DIR, 'inventario.json'),
    historial: path.join(DATA_DIR, 'historial.json'),
    recetas: path.join(DATA_DIR, 'recetas.json'),
    produccion: path.join(DATA_DIR, 'produccion.json'),
    auditoria: path.join(DATA_DIR, 'auditoria.json')
};

// ==================================================
// FUNCIONES HELPER PARA BASE DE DATOS JSON
// ==================================================
function leerDatos(archivo) {
    try {
        if (fs.existsSync(archivo)) {
            const data = fs.readFileSync(archivo, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error(`Error leyendo ${archivo}:`, error);
    }
    return [];
}

function guardarDatos(archivo, datos) {
    try {
        fs.writeFileSync(archivo, JSON.stringify(datos, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error(`Error guardando ${archivo}:`, error);
        return false;
    }
}

function generarId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ==================================================
// INICIALIZACIÓN DE DATOS
// ==================================================
function inicializarDatos() {
    // Usuarios
    if (!fs.existsSync(FILES.usuarios)) {
        const passwordHash = bcrypt.hashSync('admin123', 10);
        guardarDatos(FILES.usuarios, [{
            id: 1,
            username: 'admin',
            password: passwordHash,
            nombreCompleto: 'Administrador del Sistema',
            rol: 'admin',
            activo: true,
            intentosFallidos: 0,
            createdAt: new Date().toISOString()
        }]);
        console.log('✅ Usuario admin creado (admin/admin123)');
    }

    // Catálogo
    if (!fs.existsSync(FILES.catalogo)) {
        guardarDatos(FILES.catalogo, [
            { id: 1, codigo: '001', nombre: 'PAPAS', unidad: 'Libra', activo: true },
            { id: 2, codigo: '002', nombre: 'ZAMBOS', unidad: 'Unidad', activo: true },
            { id: 3, codigo: '003', nombre: 'CARNE MOLIDA', unidad: 'Libra', activo: true },
            { id: 4, codigo: '004', nombre: 'ACEITE', unidad: 'Litro', activo: true }
        ]);
    }

    // Inventario
    if (!fs.existsSync(FILES.inventario)) {
        guardarDatos(FILES.inventario, [
            { codigo: '001', ingrediente: 'PAPAS', unidad: 'Libra', stock: 12.0, costoUnitario: 2.31, stockMinimo: 5 },
            { codigo: '002', ingrediente: 'ZAMBOS', unidad: 'Unidad', stock: 11.0, costoUnitario: 1.38, stockMinimo: 5 },
            { codigo: '003', ingrediente: 'CARNE MOLIDA', unidad: 'Libra', stock: 8.0, costoUnitario: 2.3, stockMinimo: 5 },
            { codigo: '004', ingrediente: 'ACEITE', unidad: 'Litro', stock: 3.5, costoUnitario: 5.0, stockMinimo: 2 }
        ]);
    }

    // Otros archivos vacíos
    ['historial', 'recetas', 'produccion', 'auditoria'].forEach(key => {
        if (!fs.existsSync(FILES[key])) {
            guardarDatos(FILES[key], []);
        }
    });
}

inicializarDatos();

// ==================================================
// MIDDLEWARE
// ==================================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: process.env.SESSION_SECRET || 'sistema-cocina-secret-2025',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 8 * 60 * 60 * 1000, // 8 horas
        httpOnly: true
    }
}));

// Motor de plantillas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware de autenticación
function requireAuth(req, res, next) {
    if (req.session && req.session.userId) {
        return next();
    }
    res.redirect('/login');
}

// Middleware para agregar usuario a las vistas
app.use((req, res, next) => {
    res.locals.user = null;
    res.locals.isAdmin = false;
    
    if (req.session && req.session.userId) {
        const usuarios = leerDatos(FILES.usuarios);
        const user = usuarios.find(u => u.id === req.session.userId);
        if (user) {
            res.locals.user = user;
            res.locals.isAdmin = user.rol === 'admin';
        }
    }
    next();
});

// ==================================================
// RUTAS DE AUTENTICACIÓN
// ==================================================
app.get('/login', (req, res) => {
    if (req.session.userId) {
        return res.redirect('/');
    }
    res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.render('login', { error: 'Ingresá usuario y contraseña' });
    }

    const usuarios = leerDatos(FILES.usuarios);
    const user = usuarios.find(u => u.username === username);

    if (!user) {
        return res.render('login', { error: 'Usuario o contraseña incorrectos' });
    }

    if (!user.activo) {
        return res.render('login', { error: 'Usuario desactivado' });
    }

    // Verificar bloqueo
    if (user.bloqueadoHasta) {
        const ahora = new Date();
        const bloqueado = new Date(user.bloqueadoHasta);
        if (ahora < bloqueado) {
            const minutos = Math.ceil((bloqueado - ahora) / 60000);
            return res.render('login', { 
                error: `Usuario bloqueado. Intentá en ${minutos} minuto(s)` 
            });
        } else {
            user.intentosFallidos = 0;
            user.bloqueadoHasta = null;
        }
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
        user.intentosFallidos = (user.intentosFallidos || 0) + 1;
        
        if (user.intentosFallidos >= 5) {
            const bloqueado = new Date();
            bloqueado.setMinutes(bloqueado.getMinutes() + 15);
            user.bloqueadoHasta = bloqueado.toISOString();
            guardarDatos(FILES.usuarios, usuarios);
            return res.render('login', { 
                error: 'Demasiados intentos. Usuario bloqueado por 15 minutos' 
            });
        }

        guardarDatos(FILES.usuarios, usuarios);
        return res.render('login', { error: 'Usuario o contraseña incorrectos' });
    }

    // Login exitoso
    user.intentosFallidos = 0;
    user.bloqueadoHasta = null;
    user.ultimoAcceso = new Date().toISOString();
    guardarDatos(FILES.usuarios, usuarios);

    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.rol = user.rol;

    res.redirect('/');
});

app.post('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// ==================================================
// RUTA PRINCIPAL - DASHBOARD
// ==================================================
app.get('/', requireAuth, (req, res) => {
    const inventario = leerDatos(FILES.inventario);
    const recetas = leerDatos(FILES.recetas);
    const produccion = leerDatos(FILES.produccion);
    
    // Calcular métricas
    const totalInventario = inventario.reduce((sum, i) => 
        sum + (i.stock * i.costoUnitario), 0
    );
    
    const stockBajo = inventario.filter(i => i.stock < i.stockMinimo);
    
    const margenPromedio = recetas.length > 0
        ? recetas.reduce((sum, r) => sum + (r.margenUtilidad || 0), 0) / recetas.length
        : 0;

    res.render('dashboard', {
        totalInventario,
        stockBajo: stockBajo.length,
        recetasActivas: recetas.length,
        margenPromedio: (margenPromedio * 100).toFixed(1),
        ultimasProduciones: produccion.slice(-5).reverse()
    });
});

// ==================================================
// RUTAS DE CATÁLOGO
// ==================================================
app.get('/catalogo', requireAuth, (req, res) => {
    const catalogo = leerDatos(FILES.catalogo).filter(c => c.activo);
    res.render('catalogo', { catalogo });
});

app.post('/catalogo/crear', requireAuth, (req, res) => {
    const { nombre, unidad } = req.body;
    
    const catalogo = leerDatos(FILES.catalogo);
    const ultimoCodigo = catalogo.length > 0 
        ? Math.max(...catalogo.map(c => parseInt(c.codigo))) 
        : 0;
    
    const nuevoCodigo = String(ultimoCodigo + 1).padStart(3, '0');
    
    const nuevoArticulo = {
        id: Date.now(),
        codigo: nuevoCodigo,
        nombre: nombre.toUpperCase(),
        unidad,
        activo: true,
        createdAt: new Date().toISOString()
    };
    
    catalogo.push(nuevoArticulo);
    guardarDatos(FILES.catalogo, catalogo);
    
    // Agregar al inventario
    const inventario = leerDatos(FILES.inventario);
    inventario.push({
        codigo: nuevoCodigo,
        ingrediente: nombre.toUpperCase(),
        unidad,
        stock: 0,
        costoUnitario: 0,
        stockMinimo: 5
    });
    guardarDatos(FILES.inventario, inventario);
    
    res.json({ success: true, codigo: nuevoCodigo });
});

app.post('/catalogo/actualizar/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const { nombre, unidad } = req.body;
    
    const catalogo = leerDatos(FILES.catalogo);
    const articulo = catalogo.find(c => c.id === parseInt(id));
    
    if (articulo) {
        articulo.nombre = nombre.toUpperCase();
        articulo.unidad = unidad;
        guardarDatos(FILES.catalogo, catalogo);
        
        // Actualizar inventario
        const inventario = leerDatos(FILES.inventario);
        const inv = inventario.find(i => i.codigo === articulo.codigo);
        if (inv) {
            inv.ingrediente = nombre.toUpperCase();
            inv.unidad = unidad;
            guardarDatos(FILES.inventario, inventario);
        }
        
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Artículo no encontrado' });
    }
});

// ==================================================
// RUTAS DE INVENTARIO/COMPRAS
// ==================================================
app.get('/inventario', requireAuth, (req, res) => {
    const catalogo = leerDatos(FILES.catalogo).filter(c => c.activo);
    const historial = leerDatos(FILES.historial);
    res.render('inventario', { catalogo, historial });
});

app.post('/inventario/registrar-compra', requireAuth, (req, res) => {
    const { noFactura, fecha, productos } = req.body;
    
    const historial = leerDatos(FILES.historial);
    const inventario = leerDatos(FILES.inventario);
    
    productos.forEach(p => {
        // Guardar en historial
        historial.push({
            id: generarId(),
            fechaFactura: fecha,
            noFactura,
            codigo: p.codigo,
            producto: p.nombre,
            unidad: p.unidad,
            cantidad: parseFloat(p.cantidad),
            costoUnitario: parseFloat(p.costoUnitario),
            costoTotal: parseFloat(p.cantidad) * parseFloat(p.costoUnitario),
            createdAt: new Date().toISOString(),
            createdBy: req.session.userId
        });
        
        // Actualizar inventario
        const inv = inventario.find(i => i.codigo === p.codigo);
        if (inv) {
            inv.stock += parseFloat(p.cantidad);
            // Recalcular costo promedio ponderado
            const totalCosto = (inv.stock - parseFloat(p.cantidad)) * inv.costoUnitario + 
                             parseFloat(p.cantidad) * parseFloat(p.costoUnitario);
            inv.costoUnitario = totalCosto / inv.stock;
        }
    });
    
    guardarDatos(FILES.historial, historial);
    guardarDatos(FILES.inventario, inventario);
    
    res.json({ success: true });
});

// ==================================================
// RUTAS DE RECETAS
// ==================================================
app.get('/recetas', requireAuth, (req, res) => {
    const recetas = leerDatos(FILES.recetas);
    const inventario = leerDatos(FILES.inventario);
    res.render('recetas', { recetas, inventario });
});

app.post('/recetas/crear', requireAuth, (req, res) => {
    const { plato, ingredientes, precioVenta, margenObjetivo } = req.body;
    
    const detalleReceta = ingredientes.map(ing => ({
        Codigo: ing.codigo,
        Nombre: ing.nombre,
        Cantidad: parseFloat(ing.cantidad),
        Costo_U: parseFloat(ing.costoUnitario),
        Subtotal: parseFloat(ing.cantidad) * parseFloat(ing.costoUnitario)
    }));
    
    const costoTotal = detalleReceta.reduce((sum, i) => sum + i.Subtotal, 0);
    const valorUtilidad = parseFloat(precioVenta) - costoTotal;
    const margenUtilidad = valorUtilidad / parseFloat(precioVenta);
    
    const recetas = leerDatos(FILES.recetas);
    recetas.push({
        id: generarId(),
        plato: plato.toUpperCase(),
        detalleReceta: JSON.stringify(detalleReceta),
        costoTotalPlato: costoTotal,
        precioVenta: parseFloat(precioVenta),
        valorUtilidad,
        margenUtilidad,
        margenObjetivo: parseFloat(margenObjetivo || 0.7),
        activo: true,
        createdAt: new Date().toISOString(),
        createdBy: req.session.userId
    });
    
    guardarDatos(FILES.recetas, recetas);
    res.json({ success: true });
});

// ==================================================
// RUTAS DE PRODUCCIÓN
// ==================================================
app.get('/produccion', requireAuth, (req, res) => {
    const recetas = leerDatos(FILES.recetas);
    const inventario = leerDatos(FILES.inventario);
    const produccion = leerDatos(FILES.produccion);
    res.render('produccion', { recetas, inventario, produccion });
});

app.post('/produccion/procesar', requireAuth, (req, res) => {
    const { plato, cantidad } = req.body;
    
    const recetas = leerDatos(FILES.recetas);
    const receta = recetas.find(r => r.plato === plato);
    
    if (!receta) {
        return res.status(404).json({ error: 'Receta no encontrada' });
    }
    
    const inventario = leerDatos(FILES.inventario);
    const detalleReceta = JSON.parse(receta.detalleReceta);
    
    // Verificar stock
    for (const ing of detalleReceta) {
        const necesario = parseFloat(ing.Cantidad) * parseInt(cantidad);
        const inv = inventario.find(i => i.codigo === ing.Codigo);
        
        if (!inv || inv.stock < necesario) {
            return res.status(400).json({ 
                error: `Stock insuficiente de ${ing.Nombre}` 
            });
        }
    }
    
    // Descontar stock
    detalleReceta.forEach(ing => {
        const necesario = parseFloat(ing.Cantidad) * parseInt(cantidad);
        const inv = inventario.find(i => i.codigo === ing.Codigo);
        if (inv) {
            inv.stock -= necesario;
        }
    });
    
    guardarDatos(FILES.inventario, inventario);
    
    // Registrar producción
    const produccion = leerDatos(FILES.produccion);
    const idOperacion = `PROD-${Date.now()}`;
    
    produccion.push({
        id: generarId(),
        fecha: new Date().toISOString(),
        idOperacion,
        plato,
        cantidad: parseInt(cantidad),
        detalle: JSON.stringify(detalleReceta),
        costoProduccion: receta.costoTotalPlato * parseInt(cantidad),
        createdAt: new Date().toISOString(),
        createdBy: req.session.userId
    });
    
    guardarDatos(FILES.produccion, produccion);
    
    res.json({ success: true, idOperacion });
});

app.post('/produccion/eliminar/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    
    const produccion = leerDatos(FILES.produccion);
    const index = produccion.findIndex(p => p.id === id);
    
    if (index === -1) {
        return res.status(404).json({ error: 'Producción no encontrada' });
    }
    
    const prod = produccion[index];
    const detalle = JSON.parse(prod.detalle);
    const inventario = leerDatos(FILES.inventario);
    
    // Revertir stock
    detalle.forEach(ing => {
        const cantidad = parseFloat(ing.Cantidad) * parseInt(prod.cantidad);
        const inv = inventario.find(i => i.codigo === ing.Codigo);
        if (inv) {
            inv.stock += cantidad;
        }
    });
    
    guardarDatos(FILES.inventario, inventario);
    
    // Eliminar registro
    produccion.splice(index, 1);
    guardarDatos(FILES.produccion, produccion);
    
    res.json({ success: true });
});

// ==================================================
// RUTAS DE REPORTES
// ==================================================
app.get('/reportes', requireAuth, (req, res) => {
    const inventario = leerDatos(FILES.inventario);
    const recetas = leerDatos(FILES.recetas);
    const produccion = leerDatos(FILES.produccion);
    
    const stockBajo = inventario.filter(i => i.stock < i.stockMinimo);
    const totalInventario = inventario.reduce((sum, i) => 
        sum + (i.stock * i.costoUnitario), 0
    );
    
    // Top 5 recetas más rentables
    const topRecetas = recetas
        .sort((a, b) => b.valorUtilidad - a.valorUtilidad)
        .slice(0, 5);
    
    res.render('reportes', {
        inventario,
        stockBajo,
        totalInventario,
        topRecetas,
        recetas,
        produccion
    });
});

// ==================================================
// RUTAS DE GESTIÓN DE USUARIOS
// ==================================================
app.get('/usuarios', requireAuth, (req, res) => {
    // Solo admin puede acceder
    const user = leerDatos(FILES.usuarios).find(u => u.id === req.session.userId);
    if (user.rol !== 'admin') {
        return res.status(403).send('Acceso denegado. Solo administradores.');
    }
    
    const usuarios = leerDatos(FILES.usuarios);
    const auditoria = leerDatos(FILES.auditoria);
    
    res.render('usuarios', { usuarios, auditoria });
});

app.post('/usuarios/crear', requireAuth, async (req, res) => {
    const user = leerDatos(FILES.usuarios).find(u => u.id === req.session.userId);
    if (user.rol !== 'admin') {
        return res.status(403).json({ error: 'Solo administradores' });
    }
    
    const { username, password, nombreCompleto, rol } = req.body;
    
    if (!username || !password || !nombreCompleto || !rol) {
        return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }
    
    const usuarios = leerDatos(FILES.usuarios);
    
    // Verificar si el usuario ya existe
    if (usuarios.find(u => u.username === username)) {
        return res.status(400).json({ error: 'El usuario ya existe' });
    }
    
    // Hash de la contraseña
    const passwordHash = await bcrypt.hash(password, 10);
    
    const nuevoUsuario = {
        id: Date.now(),
        username,
        password: passwordHash,
        nombreCompleto,
        rol,
        activo: true,
        intentosFallidos: 0,
        createdAt: new Date().toISOString(),
        createdBy: req.session.userId
    };
    
    usuarios.push(nuevoUsuario);
    guardarDatos(FILES.usuarios, usuarios);
    
    // Registrar en auditoría
    const auditoria = leerDatos(FILES.auditoria);
    auditoria.push({
        id: generarId(),
        usuarioId: req.session.userId,
        accion: 'CREAR_USUARIO',
        detalles: `Usuario creado: ${username} (${rol})`,
        timestamp: new Date().toISOString(),
        ip: req.ip
    });
    guardarDatos(FILES.auditoria, auditoria);
    
    res.json({ success: true, message: 'Usuario creado exitosamente' });
});

app.post('/usuarios/actualizar/:id', requireAuth, async (req, res) => {
    const user = leerDatos(FILES.usuarios).find(u => u.id === req.session.userId);
    if (user.rol !== 'admin') {
        return res.status(403).json({ error: 'Solo administradores' });
    }
    
    const { id } = req.params;
    const { nombreCompleto, rol, activo } = req.body;
    
    const usuarios = leerDatos(FILES.usuarios);
    const index = usuarios.findIndex(u => u.id === parseInt(id));
    
    if (index === -1) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    usuarios[index].nombreCompleto = nombreCompleto;
    usuarios[index].rol = rol;
    usuarios[index].activo = activo;
    usuarios[index].updatedAt = new Date().toISOString();
    
    guardarDatos(FILES.usuarios, usuarios);
    
    // Auditoría
    const auditoria = leerDatos(FILES.auditoria);
    auditoria.push({
        id: generarId(),
        usuarioId: req.session.userId,
        accion: 'ACTUALIZAR_USUARIO',
        detalles: `Usuario actualizado: ${usuarios[index].username}`,
        timestamp: new Date().toISOString(),
        ip: req.ip
    });
    guardarDatos(FILES.auditoria, auditoria);
    
    res.json({ success: true });
});

app.post('/usuarios/cambiar-password/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;
    
    const user = leerDatos(FILES.usuarios).find(u => u.id === req.session.userId);
    
    // Solo admin puede cambiar password de otros, o el mismo usuario
    if (user.rol !== 'admin' && req.session.userId !== parseInt(id)) {
        return res.status(403).json({ error: 'No autorizado' });
    }
    
    if (!password || password.length < 6) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }
    
    const usuarios = leerDatos(FILES.usuarios);
    const index = usuarios.findIndex(u => u.id === parseInt(id));
    
    if (index === -1) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    usuarios[index].password = await bcrypt.hash(password, 10);
    usuarios[index].updatedAt = new Date().toISOString();
    
    guardarDatos(FILES.usuarios, usuarios);
    
    // Auditoría
    const auditoria = leerDatos(FILES.auditoria);
    auditoria.push({
        id: generarId(),
        usuarioId: req.session.userId,
        accion: 'CAMBIAR_PASSWORD',
        detalles: `Contraseña cambiada para: ${usuarios[index].username}`,
        timestamp: new Date().toISOString(),
        ip: req.ip
    });
    guardarDatos(FILES.auditoria, auditoria);
    
    res.json({ success: true, message: 'Contraseña actualizada' });
});

app.post('/usuarios/toggle/:id', requireAuth, (req, res) => {
    const user = leerDatos(FILES.usuarios).find(u => u.id === req.session.userId);
    if (user.rol !== 'admin') {
        return res.status(403).json({ error: 'Solo administradores' });
    }
    
    const { id } = req.params;
    const usuarios = leerDatos(FILES.usuarios);
    const index = usuarios.findIndex(u => u.id === parseInt(id));
    
    if (index === -1) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // No permitir desactivar el propio usuario
    if (parseInt(id) === req.session.userId) {
        return res.status(400).json({ error: 'No podés desactivar tu propio usuario' });
    }
    
    usuarios[index].activo = !usuarios[index].activo;
    usuarios[index].updatedAt = new Date().toISOString();
    
    guardarDatos(FILES.usuarios, usuarios);
    
    // Auditoría
    const auditoria = leerDatos(FILES.auditoria);
    auditoria.push({
        id: generarId(),
        usuarioId: req.session.userId,
        accion: usuarios[index].activo ? 'ACTIVAR_USUARIO' : 'DESACTIVAR_USUARIO',
        detalles: `Usuario ${usuarios[index].activo ? 'activado' : 'desactivado'}: ${usuarios[index].username}`,
        timestamp: new Date().toISOString(),
        ip: req.ip
    });
    guardarDatos(FILES.auditoria, auditoria);
    
    res.json({ success: true, activo: usuarios[index].activo });
});

// ==================================================
// API ENDPOINTS
// ==================================================
app.get('/api/inventario', requireAuth, (req, res) => {
    const inventario = leerDatos(FILES.inventario);
    res.json(inventario);
});

app.get('/api/receta/:plato', requireAuth, (req, res) => {
    const recetas = leerDatos(FILES.recetas);
    const receta = recetas.find(r => r.plato === req.params.plato);
    
    if (receta) {
        receta.detalleReceta = JSON.parse(receta.detalleReceta);
        res.json(receta);
    } else {
        res.status(404).json({ error: 'Receta no encontrada' });
    }
});

// ==================================================
// INICIAR SERVIDOR
// ==================================================
app.listen(PORT, () => {
    console.log('\n🍳 ========================================');
    console.log('   SISTEMA DE CONTROL DE COCINA');
    console.log('   Node.js Professional Edition');
    console.log('========================================');
    console.log(`\n✅ Servidor corriendo en: http://localhost:${PORT}`);
    console.log('\n👤 Credenciales por defecto:');
    console.log('   Usuario: admin');
    console.log('   Contraseña: admin123');
    console.log('\n📁 Datos almacenados en: ${DATA_DIR}');
    console.log('========================================\n');
});
