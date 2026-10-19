/* Datos de ejemplo del prototipo. En producción vendrían de la API / base de datos. */

const PROVINCES = [
  'Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba', 'Corrientes', 'Entre Ríos',
  'Formosa', 'Jujuy', 'La Pampa', 'La Rioja', 'Mendoza', 'Misiones', 'Neuquén', 'Río Negro',
  'Salta', 'San Juan', 'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero',
  'Tierra del Fuego', 'Tucumán'
];

// Ciudades y alias que el chat reconoce para inferir la provincia
const PROVINCE_ALIASES = {
  'capital federal': 'CABA', 'ciudad de buenos aires': 'CABA', 'ciudad autonoma': 'CABA', 'caba': 'CABA', 'palermo': 'CABA',
  'provincia de buenos aires': 'Buenos Aires', 'bs as': 'Buenos Aires', 'pba': 'Buenos Aires', 'la plata': 'Buenos Aires',
  'mar del plata': 'Buenos Aires', 'bahia blanca': 'Buenos Aires', 'conurbano': 'Buenos Aires', 'la matanza': 'Buenos Aires',
  'rosario': 'Santa Fe', 'rafaela': 'Santa Fe', 'parana': 'Entre Ríos', 'villa maria': 'Córdoba', 'rio cuarto': 'Córdoba',
  'bariloche': 'Río Negro', 'ushuaia': 'Tierra del Fuego', 'rio grande': 'Tierra del Fuego', 'yerba buena': 'Tucumán',
  'san miguel de tucuman': 'Tucumán', 'resistencia': 'Chaco', 'posadas': 'Misiones', 'comodoro': 'Chubut', 'trelew': 'Chubut',
  'santa rosa': 'La Pampa', 'rio gallegos': 'Santa Cruz', 'san salvador de jujuy': 'Jujuy',
  'cualquier': 'any', 'todas': 'any', 'todo el pais': 'any', 'me da igual': 'any', 'donde sea': 'any', 'indistinto': 'any'
};

const AREAS = [
  { id: 'tecnologia', label: 'Tecnología / IT', icon: 'ph-code', kw: ['programador', 'programadora', 'desarrollador', 'desarrolladora', 'developer', 'sistemas', 'software', 'informatica', 'soporte tecnico', 'soporte it', 'help desk', 'frontend', 'backend', 'fullstack', 'full stack', 'analista de datos', 'data', 'qa', 'tester', 'devops', 'react', 'java', 'python'] },
  { id: 'ventas', label: 'Ventas / Comercial', icon: 'ph-handshake', kw: ['vendedor', 'vendedora', 'ventas', 'comercial', 'ejecutivo de cuentas', 'promotor', 'promotora', 'asesor comercial', 'asesora comercial', 'preventista', 'repositor'] },
  { id: 'administracion', label: 'Administración', icon: 'ph-folders', kw: ['administrativo', 'administrativa', 'administracion', 'recepcionista', 'secretario', 'secretaria', 'asistente', 'data entry', 'facturacion'] },
  { id: 'finanzas', label: 'Contabilidad / Finanzas', icon: 'ph-calculator', kw: ['contador', 'contadora', 'contable', 'finanzas', 'tesoreria', 'impuestos', 'liquidador', 'liquidacion', 'sueldos', 'auditor', 'cuentas a pagar', 'contabilidad'] },
  { id: 'atencion', label: 'Atención al cliente', icon: 'ph-headset', kw: ['call center', 'atencion', 'telemarketer', 'cajero', 'cajera', 'servicio al cliente', 'teleoperador', 'customer'] },
  { id: 'logistica', label: 'Logística / Depósito', icon: 'ph-truck', kw: ['chofer', 'repartidor', 'repartidora', 'deposito', 'logistica', 'autoelevador', 'almacen', 'camionero', 'delivery', 'expedicion'] },
  { id: 'salud', label: 'Salud', icon: 'ph-first-aid-kit', kw: ['enfermero', 'enfermera', 'medico', 'medica', 'kinesiologo', 'kinesiologa', 'farmacia', 'farmaceutico', 'odontologo', 'salud', 'acompanante terapeutico', 'cuidador', 'cuidadora', 'psicologo', 'psicologa', 'nutricionista'] },
  { id: 'gastronomia', label: 'Gastronomía / Hotelería', icon: 'ph-fork-knife', kw: ['mozo', 'moza', 'cocinero', 'cocinera', 'chef', 'bartender', 'camarero', 'camarera', 'hotel', 'ayudante de cocina', 'pastelero', 'barista', 'mucama', 'gastronomia'] },
  { id: 'oficios', label: 'Construcción / Oficios', icon: 'ph-hammer', kw: ['albanil', 'electricista', 'plomero', 'gasista', 'soldador', 'mantenimiento', 'construccion', 'pintor', 'carpintero', 'herrero', 'mecanico', 'tecnico'] },
  { id: 'produccion', label: 'Producción / Industria', icon: 'ph-factory', kw: ['operario', 'operaria', 'produccion', 'fabrica', 'industria', 'planta', 'maquinista', 'envasado', 'calidad'] },
  { id: 'marketing', label: 'Marketing', icon: 'ph-megaphone', kw: ['marketing', 'disenador', 'disenadora', 'community manager', 'redes sociales', 'diseno', 'publicidad', 'contenido', 'social media', 'fotografo', 'editor de video'] },
  { id: 'rrhh', label: 'RRHH', icon: 'ph-users-three', kw: ['rrhh', 'recursos humanos', 'recruiter', 'seleccion', 'reclutador', 'reclutadora', 'talento'] },
  { id: 'educacion', label: 'Educación', icon: 'ph-graduation-cap', kw: ['docente', 'profesor', 'profesora', 'maestro', 'maestra', 'tutor', 'educacion', 'preceptor', 'ensenanza'] },
  { id: 'comex', label: 'Comex', icon: 'ph-globe-hemisphere-west', kw: ['comex', 'comercio exterior', 'comercio internacional', 'aduana', 'despachante', 'importacion', 'exportacion', 'importaciones', 'exportaciones', 'trade'] },
  { id: 'arquitectura', label: 'Arquitectura', icon: 'ph-compass-tool', kw: ['arquitecto', 'arquitecta', 'arquitectura', 'dibujante', 'proyectista', 'autocad', 'revit', 'maestro mayor de obras', 'diseno de interiores'] },
  { id: 'ingenieria', label: 'Ingeniería', icon: 'ph-gear-six', kw: ['ingeniero', 'ingeniera', 'ingenieria', 'agronomo', 'agronoma'] }
];

const SENIORITIES = [
  { id: 'sin-exp', label: 'Sin experiencia', hint: 'Primer empleo o menos de 1 año' },
  { id: 'junior', label: 'Junior', hint: '1 a 2 años' },
  { id: 'semi', label: 'Semi Senior', hint: '3 a 5 años' },
  { id: 'senior', label: 'Senior', hint: 'Más de 5 años' }
];

const MODALITIES = ['Presencial', 'Híbrido', 'Remoto'];
const JOB_TYPES = ['Full time', 'Part time', 'Por proyecto'];

const COMPANIES = {
  'Talento Norte':      { type: 'Consultora', color: '#0866FF', benefits: ['Obra social', 'Capacitaciones', 'Bono por desempeño'] },
  'Selecta RRHH':       { type: 'Consultora', color: '#7B3FE4', benefits: ['Obra social', 'Plan de carrera'] },
  'Bit Solutions':      { type: 'Empresa',    color: '#0F9D8A', benefits: ['Home office', 'Clases de inglés', 'Semana extra de vacaciones'] },
  'Grupo Andino':       { type: 'Empresa',    color: '#E2582B', benefits: ['Obra social', 'Comedor', 'Uniforme'] },
  'Logística Federal':  { type: 'Empresa',    color: '#1F6FB2', benefits: ['Premio por presentismo', 'Obra social'] },
  'Clínica del Parque': { type: 'Empresa',    color: '#D23B6E', benefits: ['Obra social premium', 'Capacitación continua'] },
  'Sabores del Sur':    { type: 'Empresa',    color: '#C9821B', benefits: ['Comida en el turno', 'Propinas'] },
  'Agro Pampa':         { type: 'Empresa',    color: '#3B8C3A', benefits: ['Transporte', 'Obra social', 'Comedor'] },
  'Retail Plus':        { type: 'Empresa',    color: '#E0245E', benefits: ['Descuentos en compras', 'Obra social'] },
  'Andes Energía':      { type: 'Empresa',    color: '#2B4C7E', benefits: ['Prepaga', 'Bono anual', 'Movilidad'] },
  'Instituto Horizonte':{ type: 'Empresa',    color: '#5A6ACF', benefits: ['Horario flexible', 'Capacitación docente'] }
};

// J(id, título, empresa, área, seniority, provincia, ciudad, modalidad, jornada, salario, díasAtrás, descripción, requisitos)
function J(id, title, company, area, seniority, province, city, modality, type, salary, daysAgo, description, requirements) {
  return { id, title, company, companyType: (COMPANIES[company] || {}).type || 'Empresa', area, seniority, province, city, modality, type, salary, daysAgo, description, requirements, benefits: (COMPANIES[company] || {}).benefits || [] };
}

const SEED_JOBS = [
  J('j1', 'Desarrollador/a Frontend React', 'Bit Solutions', 'tecnologia', 'semi', 'CABA', 'Palermo', 'Híbrido', 'Full time', '$1.800.000 a $2.300.000', 1,
    'Vas a sumarte al equipo de producto para construir interfaces de una plataforma de pagos usada por miles de comercios.',
    ['3 años o más con React y TypeScript', 'Experiencia consumiendo APIs REST', 'Buen manejo de Git y trabajo en equipo']),
  J('j2', 'Soporte técnico IT', 'Talento Norte', 'tecnologia', 'junior', 'Tucumán', 'San Miguel de Tucumán', 'Presencial', 'Full time', '$950.000', 2,
    'Para importante empresa de servicios buscamos técnico/a para soporte a usuarios, instalación de equipos y redes.',
    ['Estudiante o técnico en sistemas', 'Conocimientos de Windows, redes y hardware', 'Buena comunicación con usuarios']),
  J('j3', 'Analista QA Manual', 'Bit Solutions', 'tecnologia', 'junior', 'Córdoba', 'Córdoba Capital', 'Remoto', 'Full time', '$1.100.000', 4,
    'Testing funcional de aplicaciones web y mobile, documentación de casos de prueba y reporte de bugs.',
    ['1 año de experiencia en testing', 'Conocimiento de Jira o similar', 'Atención al detalle']),
  J('j4', 'Desarrollador/a Backend Node.js', 'Selecta RRHH', 'tecnologia', 'senior', 'Santa Fe', 'Rosario', 'Remoto', 'Full time', 'USD 3.000 a 3.800', 6,
    'Para cliente del sector fintech buscamos backend senior para diseñar servicios escalables.',
    ['5 años o más con Node.js', 'Bases de datos SQL y NoSQL', 'Experiencia en AWS o GCP', 'Inglés intermedio']),
  J('j5', 'Vendedor/a de salón', 'Retail Plus', 'ventas', 'sin-exp', 'Córdoba', 'Córdoba Capital', 'Presencial', 'Part time', '$600.000', 1,
    'Atención y asesoramiento a clientes en tienda de indumentaria, reposición y orden del salón.',
    ['Secundario completo', 'Disponibilidad fines de semana', 'Buena predisposición']),
  J('j6', 'Ejecutivo/a comercial B2B', 'Talento Norte', 'ventas', 'semi', 'Tucumán', 'San Miguel de Tucumán', 'Híbrido', 'Full time', '$1.200.000 + comisiones', 3,
    'Para empresa de insumos industriales: desarrollo de cartera de clientes en el NOA.',
    ['3 años en ventas B2B', 'Registro de conducir', 'Manejo de CRM']),
  J('j7', 'Asesor/a comercial', 'Grupo Andino', 'ventas', 'junior', 'Mendoza', 'Godoy Cruz', 'Presencial', 'Full time', null, 9,
    'Asesoramiento y venta de planes de ahorro en concesionaria oficial.',
    ['Experiencia en ventas', 'Orientación a resultados', 'Secundario completo']),
  J('j8', 'Asistente administrativo/a', 'Talento Norte', 'administracion', 'junior', 'Tucumán', 'Yerba Buena', 'Presencial', 'Full time', '$850.000', 0,
    'Gestión de agenda, carga de comprobantes, atención telefónica y soporte al área de administración.',
    ['Manejo de Excel', 'Experiencia en tareas administrativas', 'Organización']),
  J('j9', 'Recepcionista bilingüe', 'Selecta RRHH', 'administracion', 'junior', 'CABA', 'Microcentro', 'Presencial', 'Full time', '$900.000', 5,
    'Recepción de visitas, atención de llamados y coordinación de salas en oficinas corporativas.',
    ['Inglés avanzado', 'Excelente presencia y trato', 'Disponibilidad de 9 a 18 h']),
  J('j10', 'Administrativo/a de facturación', 'Agro Pampa', 'administracion', 'semi', 'Buenos Aires', 'Pergamino', 'Presencial', 'Full time', '$1.000.000', 8,
    'Emisión de facturas, control de cuenta corriente de clientes y conciliaciones.',
    ['3 años en facturación', 'Manejo de sistemas de gestión', 'Estudiante de carreras económicas']),
  J('j11', 'Analista contable', 'Selecta RRHH', 'finanzas', 'semi', 'Córdoba', 'Córdoba Capital', 'Híbrido', 'Full time', '$1.300.000', 2,
    'Registración contable, conciliaciones bancarias, cierres mensuales y apoyo en balances.',
    ['Contador/a o estudiante avanzado', '3 años de experiencia', 'Excel avanzado']),
  J('j12', 'Liquidador/a de sueldos', 'Talento Norte', 'finanzas', 'senior', 'Salta', 'Salta Capital', 'Híbrido', 'Full time', '$1.500.000', 7,
    'Liquidación de haberes de más de 300 empleados bajo distintos convenios.',
    ['5 años liquidando sueldos', 'Conocimiento de convenios colectivos', 'Manejo de Tango o similar']),
  J('j13', 'Representante de atención al cliente', 'Retail Plus', 'atencion', 'sin-exp', 'Buenos Aires', 'La Plata', 'Remoto', 'Part time', '$550.000', 1,
    'Atención por chat y WhatsApp a clientes de la tienda online, desde tu casa.',
    ['Buena ortografía', 'Conexión a internet estable', 'Secundario completo']),
  J('j14', 'Cajero/a', 'Retail Plus', 'atencion', 'sin-exp', 'Tucumán', 'San Miguel de Tucumán', 'Presencial', 'Part time', '$580.000', 3,
    'Cobro en línea de cajas, arqueo y atención a clientes en supermercado.',
    ['Secundario completo', 'Disponibilidad horaria rotativa']),
  J('j15', 'Chofer de reparto', 'Logística Federal', 'logistica', 'junior', 'Buenos Aires', 'La Matanza', 'Presencial', 'Full time', '$1.050.000', 2,
    'Reparto de mercadería a comercios del oeste del conurbano con vehículo de la empresa.',
    ['Licencia profesional vigente', 'Conocimiento de la zona', 'Buena predisposición']),
  J('j16', 'Operario/a de depósito', 'Logística Federal', 'logistica', 'sin-exp', 'Santa Fe', 'Rosario', 'Presencial', 'Full time', '$780.000', 4,
    'Preparación de pedidos, carga y descarga, control de stock en centro de distribución.',
    ['Secundario completo', 'Disponibilidad turno tarde', 'Se valora manejo de autoelevador']),
  J('j17', 'Enfermero/a profesional', 'Clínica del Parque', 'salud', 'semi', 'Tucumán', 'San Miguel de Tucumán', 'Presencial', 'Full time', '$1.150.000', 1,
    'Atención de pacientes en área de internación general, turnos rotativos.',
    ['Título de enfermero/a profesional', 'Matrícula provincial', '3 años de experiencia']),
  J('j18', 'Kinesiólogo/a', 'Clínica del Parque', 'salud', 'junior', 'Salta', 'Salta Capital', 'Presencial', 'Part time', null, 10,
    'Rehabilitación de pacientes ambulatorios en consultorio de traumatología.',
    ['Título habilitante y matrícula', 'Disponibilidad por la tarde']),
  J('j19', 'Mozo/a', 'Sabores del Sur', 'gastronomia', 'sin-exp', 'Neuquén', 'Neuquén Capital', 'Presencial', 'Part time', '$520.000 + propinas', 2,
    'Atención de mesas en restaurante céntrico, turno noche.',
    ['Buena presencia y trato', 'Disponibilidad fines de semana']),
  J('j20', 'Cocinero/a', 'Sabores del Sur', 'gastronomia', 'semi', 'Mendoza', 'Mendoza Capital', 'Presencial', 'Full time', '$950.000', 6,
    'Elaboración de platos de la carta, control de mise en place y stock de cocina.',
    ['3 años en cocinas de restaurante', 'Manipulación de alimentos', 'Trabajo en equipo']),
  J('j21', 'Electricista industrial', 'Andes Energía', 'oficios', 'semi', 'San Juan', 'San Juan Capital', 'Presencial', 'Full time', '$1.400.000', 3,
    'Mantenimiento eléctrico preventivo y correctivo en planta de energía.',
    ['Técnico electricista', 'Experiencia en tableros y motores', 'Disponibilidad para guardias']),
  J('j22', 'Técnico/a de mantenimiento', 'Grupo Andino', 'oficios', 'junior', 'Tucumán', 'Tafí Viejo', 'Presencial', 'Full time', '$900.000', 5,
    'Mantenimiento edilicio y de maquinaria en planta industrial.',
    ['Conocimientos de electricidad y mecánica', 'Secundario técnico']),
  J('j23', 'Operario/a de producción', 'Agro Pampa', 'produccion', 'sin-exp', 'Entre Ríos', 'Paraná', 'Presencial', 'Full time', '$800.000', 1,
    'Tareas de producción y envasado en planta de alimentos. Transporte incluido.',
    ['Secundario completo', 'Disponibilidad turnos rotativos']),
  J('j24', 'Community Manager', 'Talento Norte', 'marketing', 'junior', 'Tucumán', 'San Miguel de Tucumán', 'Remoto', 'Part time', '$650.000', 4,
    'Gestión de redes sociales para marcas regionales: contenido, calendario y métricas.',
    ['Experiencia gestionando Instagram y TikTok', 'Manejo de Canva', 'Buena redacción']),
  J('j25', 'Diseñador/a gráfico/a', 'Bit Solutions', 'marketing', 'semi', 'CABA', 'Palermo', 'Híbrido', 'Full time', '$1.400.000', 8,
    'Diseño de piezas digitales y de producto junto al equipo de marketing.',
    ['Portfolio actualizado', 'Figma y Adobe Suite', '3 años de experiencia']),
  J('j26', 'Analista de selección', 'Selecta RRHH', 'rrhh', 'junior', 'Córdoba', 'Córdoba Capital', 'Híbrido', 'Full time', '$950.000', 3,
    'Búsquedas masivas y de mandos medios: publicación, entrevistas y reportes a clientes.',
    ['Psicología, RRHH o afines', '1 año en selección']),
  J('j27', 'Docente de inglés', 'Instituto Horizonte', 'educacion', 'junior', 'Jujuy', 'San Salvador de Jujuy', 'Presencial', 'Part time', null, 2,
    'Clases para niveles inicial e intermedio en instituto de idiomas.',
    ['Profesorado o traductorado', 'Disponibilidad por la tarde']),
  J('j28', 'Ingeniero/a agrónomo/a', 'Agro Pampa', 'ingenieria', 'semi', 'Buenos Aires', 'Junín', 'Presencial', 'Full time', '$1.900.000', 5,
    'Asesoramiento técnico a productores y seguimiento de ensayos a campo.',
    ['Ingeniero/a agrónomo/a', 'Registro de conducir', 'Disponibilidad para viajar']),
  J('j29', 'Ingeniero/a industrial', 'Andes Energía', 'ingenieria', 'senior', 'Neuquén', 'Neuquén Capital', 'Híbrido', 'Full time', '$2.800.000', 9,
    'Liderar proyectos de mejora continua y eficiencia en operaciones.',
    ['Ingeniero/a industrial', '5 años en industria', 'Experiencia en Lean']),
  J('j30', 'Recepcionista de consultorio', 'Clínica del Parque', 'administracion', 'sin-exp', 'Tucumán', 'San Miguel de Tucumán', 'Presencial', 'Part time', '$600.000', 2,
    'Recepción de pacientes, asignación de turnos y atención telefónica en consultorios externos.',
    ['Secundario completo', 'Buen trato con el público', 'Disponibilidad de 14 a 20 h']),
  J('j31', 'Data entry', 'Selecta RRHH', 'administracion', 'junior', 'Buenos Aires', 'La Plata', 'Remoto', 'Full time', '$780.000', 3,
    'Carga y control de datos de clientes en sistema de gestión, 100% desde tu casa.',
    ['Manejo de Excel', 'Velocidad de tipeo', 'Computadora propia e internet estable']),
  J('j32', 'Auxiliar contable', 'Talento Norte', 'finanzas', 'junior', 'Tucumán', 'San Miguel de Tucumán', 'Presencial', 'Full time', '$900.000', 1,
    'Para estudio contable: registración de comprobantes, conciliaciones bancarias y liquidación de IVA.',
    ['Estudiante de Contador Público', 'Excel intermedio', 'Se valora experiencia en estudios']),
  J('j33', 'Analista de comercio exterior', 'Selecta RRHH', 'comex', 'semi', 'Santa Fe', 'Rosario', 'Híbrido', 'Full time', '$1.450.000', 2,
    'Gestión de operaciones de importación y exportación, seguimiento de embarques y documentación aduanera.',
    ['Título en Comercio Exterior o afines', '3 años en operaciones de comex', 'Inglés intermedio', 'Manejo de SIM/Malvina']),
  J('j34', 'Arquitecto/a junior', 'Grupo Andino', 'arquitectura', 'junior', 'Mendoza', 'Mendoza Capital', 'Presencial', 'Full time', '$1.100.000', 3,
    'Desarrollo de documentación de obra, relevamientos y seguimiento de proyectos residenciales.',
    ['Arquitecto/a recibido/a', 'AutoCAD y Revit', 'Registro de conducir']),
];

/* Empresa cliente de cada búsqueda de consultora: [cliente, rubro, mostrar nombre a candidatos] */
const SEED_CLIENTS = {
  j2:  ['Servicios Integrales NOA', 'Servicios', true],
  j6:  ['Insumos del Norte S.A.', 'Industria', false],
  j8:  ['Estudio Contable Ruiz & Asoc.', 'Estudio contable', true],
  j32: ['Estudio Contable Ruiz & Asoc.', 'Estudio contable', true],
  j12: ['Azucarera del Valle', 'Agroindustria', false],
  j24: ['Bodega Valle Calchaquí', 'Bebidas', true],
  j4:  ['Pagos Rápidos', 'Fintech', false],
  j9:  ['Grupo Inversor Plata', 'Finanzas', true],
  j11: ['Distribuidora Mediterránea', 'Consumo masivo', true],
  j26: ['Contacto Córdoba', 'Call center', true],
  j31: ['Aseguradora del Plata', 'Seguros', false],
  j33: ['Agroexport Litoral', 'Agroexportación', true]
};
SEED_JOBS.forEach(j => {
  const c = SEED_CLIENTS[j.id];
  if (c) Object.assign(j, { client: c[0], clientIndustry: c[1], showClient: c[2] });
});

// Candidatos que aceptaron ser contactados (para "Buscar candidatos")
const SEED_CANDIDATES = [
  { id: 'c1', name: 'Lucía Fernández', headline: 'Asistente administrativa', area: 'administracion', province: 'Tucumán', city: 'Yerba Buena', seniority: 'junior', skills: ['Excel', 'Facturación', 'Atención telefónica'], email: 'lucia.fernandez@mail.com', phone: '381 555-1234' },
  { id: 'c2', name: 'Martín Gómez', headline: 'Técnico en sistemas', area: 'tecnologia', province: 'Tucumán', city: 'San Miguel de Tucumán', seniority: 'junior', skills: ['Redes', 'Windows', 'Hardware'], email: 'martin.gomez@mail.com', phone: '381 555-2345' },
  { id: 'c3', name: 'Sofía Herrera', headline: 'Vendedora B2B', area: 'ventas', province: 'Tucumán', city: 'San Miguel de Tucumán', seniority: 'semi', skills: ['CRM', 'Negociación', 'Cartera propia'], email: 'sofia.herrera@mail.com', phone: '381 555-3456' },
  { id: 'c4', name: 'Diego Romero', headline: 'Liquidador de sueldos', area: 'finanzas', province: 'Salta', city: 'Salta Capital', seniority: 'senior', skills: ['Tango', 'Convenios', 'AFIP'], email: 'diego.romero@mail.com', phone: '387 555-4567' },
  { id: 'c5', name: 'Camila Paz', headline: 'Community Manager', area: 'marketing', province: 'Tucumán', city: 'San Miguel de Tucumán', seniority: 'junior', skills: ['Instagram', 'Canva', 'Copywriting'], email: 'camila.paz@mail.com', phone: '381 555-5678' },
  { id: 'c6', name: 'Juan Pablo Ríos', headline: 'Desarrollador Frontend', area: 'tecnologia', province: 'Córdoba', city: 'Córdoba Capital', seniority: 'semi', skills: ['React', 'TypeScript', 'Tailwind'], email: 'jp.rios@mail.com', phone: '351 555-6789' },
  { id: 'c7', name: 'Valentina Sosa', headline: 'Enfermera profesional', area: 'salud', province: 'Tucumán', city: 'Banda del Río Salí', seniority: 'semi', skills: ['Internación', 'Guardia', 'Matrícula vigente'], email: 'valen.sosa@mail.com', phone: '381 555-7890' },
  { id: 'c8', name: 'Nicolás Acosta', headline: 'Chofer profesional', area: 'logistica', province: 'Buenos Aires', city: 'Morón', seniority: 'semi', skills: ['Licencia profesional', 'Reparto', 'Zona oeste'], email: 'nico.acosta@mail.com', phone: '11 5555-8901' },
  { id: 'c9', name: 'Florencia Díaz', headline: 'Analista de selección', area: 'rrhh', province: 'Córdoba', city: 'Córdoba Capital', seniority: 'junior', skills: ['Entrevistas', 'LinkedIn Recruiter', 'Búsquedas masivas'], email: 'flor.diaz@mail.com', phone: '351 555-9012' },
  { id: 'c10', name: 'Tomás Villalba', headline: 'Cocinero', area: 'gastronomia', province: 'Mendoza', city: 'Godoy Cruz', seniority: 'semi', skills: ['Cocina de autor', 'Mise en place', 'Manipulación de alimentos'], email: 'tomas.villalba@mail.com', phone: '261 555-0123' },
  { id: 'c11', name: 'Agustina Medina', headline: 'Recepcionista', area: 'administracion', province: 'Tucumán', city: 'San Miguel de Tucumán', seniority: 'sin-exp', skills: ['Atención al público', 'Inglés intermedio'], email: 'agus.medina@mail.com', phone: '381 555-1122' },
  { id: 'c12', name: 'Federico Luna', headline: 'Técnico de mantenimiento', area: 'oficios', province: 'Tucumán', city: 'Tafí Viejo', seniority: 'junior', skills: ['Electricidad', 'Mecánica', 'Soldadura'], email: 'fede.luna@mail.com', phone: '381 555-3344' },
  { id: 'c13', name: 'Rocío Juárez', headline: 'Administrativa contable', area: 'finanzas', province: 'Tucumán', city: 'San Miguel de Tucumán', seniority: 'semi', skills: ['Tango', 'Excel', 'Conciliaciones'], email: 'rocio.juarez@mail.com', phone: '381 555-4411' },
  { id: 'c14', name: 'Matías Herrera', headline: 'Help desk', area: 'tecnologia', province: 'Tucumán', city: 'San Miguel de Tucumán', seniority: 'junior', skills: ['Windows', 'Soporte a usuarios', 'Redes'], email: 'matias.herrera@mail.com', phone: '381 555-4422' },
  { id: 'c15', name: 'Paula Ibáñez', headline: 'Vendedora de salón', area: 'ventas', province: 'Tucumán', city: 'Yerba Buena', seniority: 'junior', skills: ['Atención al público', 'Caja', 'Ventas'], email: 'paula.ibanez@mail.com', phone: '381 555-4433' },
  { id: 'c16', name: 'Gonzalo Ruiz', headline: 'Ejecutivo de cuentas', area: 'ventas', province: 'Salta', city: 'Salta Capital', seniority: 'senior', skills: ['Salesforce', 'Ventas B2B', 'Negociación'], email: 'gonzalo.ruiz@mail.com', phone: '387 555-4444' },
  { id: 'c17', name: 'Micaela Torres', headline: 'Liquidadora de sueldos', area: 'finanzas', province: 'Tucumán', city: 'San Miguel de Tucumán', seniority: 'junior', skills: ['Tango Sueldos', 'F.931', 'Excel'], email: 'mica.torres@mail.com', phone: '381 555-4455' },
  { id: 'c18', name: 'Ezequiel Pereyra', headline: 'Diseñador gráfico', area: 'marketing', province: 'Tucumán', city: 'Yerba Buena', seniority: 'junior', skills: ['Photoshop', 'Canva', 'Instagram'], email: 'eze.pereyra@mail.com', phone: '381 555-4466' },
  { id: 'c19', name: 'Carla Benítez', headline: 'Secretaria administrativa', area: 'administracion', province: 'Tucumán', city: 'San Miguel de Tucumán', seniority: 'senior', skills: ['Excel avanzado', 'Agenda', 'Facturación'], email: 'carla.benitez@mail.com', phone: '381 555-4477' },
  { id: 'c20', name: 'Leandro Castro', headline: 'Cajero', area: 'atencion', province: 'Tucumán', city: 'Banda del Río Salí', seniority: 'sin-exp', skills: ['Caja', 'Atención al público'], email: 'lean.castro@mail.com', phone: '381 555-4488' },
  { id: 'c21', name: 'Julieta Navarro', headline: 'Estudiante de Contador Público', area: 'finanzas', province: 'Tucumán', city: 'Tafí Viejo', seniority: 'sin-exp', skills: ['Excel', 'Contabilidad básica'], email: 'juli.navarro@mail.com', phone: '381 555-4499' },
  { id: 'c22', name: 'Bruno Sánchez', headline: 'Técnico en computación', area: 'tecnologia', province: 'Tucumán', city: 'Lules', seniority: 'junior', skills: ['Reparación de PC'], email: 'bruno.sanchez@mail.com', phone: '381 555-4500', scanned: true }
];

// Postulaciones de ejemplo a las vacantes de la cuenta demo (Talento Norte)
const SEED_APPS = [
  { id: 'a1', jobId: 'j8', cand: 'c1', status: 'Nuevo', daysAgo: 0, message: 'Tengo disponibilidad inmediata y vivo cerca de Yerba Buena.' },
  { id: 'a2', jobId: 'j8', cand: 'c11', status: 'En revisión', daysAgo: 0 },
  { id: 'a3', jobId: 'j2', cand: 'c2', status: 'Entrevista', daysAgo: 1 },
  { id: 'a4', jobId: 'j6', cand: 'c3', status: 'Nuevo', daysAgo: 1, message: 'Tengo cartera propia en el NOA.' },
  { id: 'a5', jobId: 'j12', cand: 'c4', status: 'En revisión', daysAgo: 3 },
  { id: 'a6', jobId: 'j24', cand: 'c5', status: 'Nuevo', daysAgo: 2 },
  { id: 'a7', jobId: 'j2', cand: 'c12', status: 'Descartado', daysAgo: 2 },
  { id: 'a8', jobId: 'j32', cand: 'c1', status: 'Nuevo', daysAgo: 0 },
  { id: 'a9', jobId: 'j6', cand: 'c11', status: 'En revisión', daysAgo: 2 },
  { id: 'a10', jobId: 'j32', cand: 'c13', status: 'Nuevo', daysAgo: 0, message: 'Trabajo hace 3 años en un estudio y manejo Tango.' },
  { id: 'a11', jobId: 'j2', cand: 'c14', status: 'Nuevo', daysAgo: 0 },
  { id: 'a12', jobId: 'j6', cand: 'c15', status: 'Nuevo', daysAgo: 1 },
  { id: 'a13', jobId: 'j6', cand: 'c16', status: 'Nuevo', daysAgo: 1, message: 'Me mudo a Tucumán el mes que viene.' },
  { id: 'a14', jobId: 'j12', cand: 'c17', status: 'Nuevo', daysAgo: 1 },
  { id: 'a15', jobId: 'j24', cand: 'c18', status: 'Nuevo', daysAgo: 2 },
  { id: 'a16', jobId: 'j8', cand: 'c19', status: 'En revisión', daysAgo: 1 },
  { id: 'a17', jobId: 'j8', cand: 'c20', status: 'Nuevo', daysAgo: 0 },
  { id: 'a18', jobId: 'j32', cand: 'c21', status: 'Nuevo', daysAgo: 0, message: 'Busco mi primera experiencia en un estudio contable.' },
  { id: 'a19', jobId: 'j2', cand: 'c22', status: 'Nuevo', daysAgo: 2 }
];

/* Perfiles de ejemplo (lo que cada empresa carga en "Mi perfil") */
const COMPANY_PROFILES = {
  'Talento Norte': {
    description: 'Consultora de recursos humanos del NOA. Hace más de 12 años acompañamos a pymes e industrias de la región en selección de personal, evaluaciones y búsquedas masivas.',
    industry: 'Recursos humanos', size: '11 a 50', address: 'Av. Mate de Luna 1850, piso 3', city: 'San Miguel de Tucumán', province: 'Tucumán',
    provinces: ['Tucumán', 'Salta', 'Jujuy', 'Santiago del Estero', 'Catamarca'],
    contactName: 'Carolina Sosa', contactEmail: 'busquedas@talentonorte.demo', contactPhone: '381 400-1200',
    website: 'www.talentonorte.demo', linkedin: 'talento-norte-demo'
  },
  'Selecta RRHH': {
    description: 'Selección de perfiles profesionales y mandos medios para empresas de todo el país.',
    industry: 'Recursos humanos', size: '51 a 200', city: 'Córdoba Capital', province: 'Córdoba', provinces: ['Córdoba', 'CABA', 'Santa Fe', 'Buenos Aires'],
    contactName: 'Martina Aguirre', contactEmail: 'seleccion@selecta.demo', website: 'www.selecta.demo', linkedin: 'selecta-rrhh-demo'
  },
  'Bit Solutions': {
    description: 'Desarrollamos software de pagos para comercios de Latinoamérica. Equipos chicos, mucha autonomía y trabajo híbrido.',
    industry: 'Tecnología', size: '51 a 200', city: 'Palermo', province: 'CABA', provinces: ['CABA', 'Córdoba'], contactEmail: 'talento@bitsolutions.demo', website: 'www.bitsolutions.demo', linkedin: 'bit-solutions-demo'
  },
  'Clínica del Parque': {
    description: 'Centro de salud con internación, guardia 24 h y consultorios externos en el norte del país.',
    industry: 'Salud', size: '201 a 500', city: 'San Miguel de Tucumán', province: 'Tucumán', provinces: ['Tucumán', 'Salta'], contactName: 'Recursos Humanos'
  }
};

/* Avatar de Fedfu (asistente). Original: assets/img/fedfu.png */
const FEDFU_IMG = 'data:image/webp;base64,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';

/* Texto de los CVs de ejemplo (lo que Fedfu lee para calcular la afinidad y el resumen).
   En producción viene del PDF que sube cada candidato. */
const SEED_CV = {
  c1: `Lucía Fernández
Asistente administrativa
lucia.fernandez@mail.com | 381 555-1234 | Yerba Buena, Tucumán
PERFIL
Asistente administrativa con experiencia en estudios contables. Organizada, con buen manejo de agenda y atención telefónica.
EXPERIENCIA
2023 - actualidad · Asistente administrativa · Estudio Contable Ruiz
Carga de comprobantes, facturación electrónica en AFIP, conciliaciones bancarias y atención de clientes.
2022 - 2023 · Recepcionista · Centro Médico Norte
ESTUDIOS
Estudiante de Contador Público (3er año) · Universidad Nacional de Tucumán
HABILIDADES
Excel avanzado (tablas dinámicas), Word, Tango Gestión, facturación, atención telefónica`,

  c2: `Martín Gómez
Técnico en sistemas
martin.gomez@mail.com | 381 555-2345 | San Miguel de Tucumán, Tucumán
PERFIL
Técnico en Sistemas con experiencia en soporte a usuarios, armado de equipos y redes.
EXPERIENCIA
2023 - actualidad · Técnico de soporte · Servicios Integrales NOA
Soporte a usuarios en Windows 10 y 11, instalación de impresoras y mantenimiento de hardware.
2022 - 2023 · Pasante de soporte IT · Municipalidad de Yerba Buena
Configuración de redes LAN y wifi, cableado estructurado.
ESTUDIOS
Técnico Superior en Sistemas Informáticos · Instituto Técnico Tucumán
HABILIDADES
Windows, Linux, redes, hardware, Active Directory, Office 365`,

  c3: `Sofía Herrera
Vendedora B2B
sofia.herrera@mail.com | 381 555-3456 | San Miguel de Tucumán, Tucumán
PERFIL
Ejecutiva comercial con 4 años de experiencia en ventas B2B de insumos industriales. Cartera propia en el NOA.
EXPERIENCIA
2022 - actualidad · Ejecutiva de cuentas · Distribuidora Norte
Gestión de cartera de 60 clientes industriales, negociación y cobranzas. Seguimiento en CRM HubSpot.
2020 - 2022 · Vendedora · Ferretería Industrial Tucumán
ESTUDIOS
Licenciatura en Comercialización (en curso) · UNSTA
HABILIDADES
CRM HubSpot, Salesforce, Excel, negociación. Licencia de conducir B1 y auto propio.`,

  c4: `Diego Romero
Liquidador de sueldos
diego.romero@mail.com | 387 555-4567 | Salta Capital, Salta
PERFIL
Liquidador de sueldos con más de 6 años de experiencia en empresas de comercio, industria y construcción.
EXPERIENCIA
2020 - actualidad · Liquidador de sueldos · Estudio Paz & Asociados
Liquidación mensual de 400 empleados bajo convenios de Comercio, UOCRA y UOM. F.931 y SICOSS.
2018 - 2020 · Auxiliar de RRHH · Supermercados del Norte
ESTUDIOS
Técnico en Administración de Personal · Universidad Católica de Salta
HABILIDADES
Tango Sueldos, Bejerman, AFIP, SICOSS, convenios colectivos, Excel avanzado`,

  c5: `Camila Paz
Community Manager
camila.paz@mail.com | 381 555-5678 | San Miguel de Tucumán, Tucumán
PERFIL
Community manager y creadora de contenido para marcas locales. Armado de calendario editorial y reels.
EXPERIENCIA
2023 - actualidad · Community Manager freelance · Marcas de gastronomía y moda
Gestión de Instagram y TikTok, reels, métricas mensuales y pauta en Meta Ads.
2022 - 2023 · Asistente de marketing · Agencia Punto
ESTUDIOS
Licenciatura en Comunicación Social (4to año) · UNT
HABILIDADES
Instagram, TikTok, Canva, CapCut, Meta Ads`,

  c6: `Juan Pablo Ríos
Desarrollador Frontend
jp.rios@mail.com | 351 555-6789 | Córdoba Capital, Córdoba
PERFIL
Desarrollador frontend con 4 años de experiencia en React y TypeScript.
EXPERIENCIA
2022 - actualidad · Frontend Developer · Software del Centro
2020 - 2022 · Desarrollador web · Agencia Pixel
ESTUDIOS
Ingeniería en Sistemas (en curso) · UTN Córdoba
HABILIDADES
React, TypeScript, JavaScript, Tailwind, Git, APIs REST, inglés intermedio`,

  c7: `Valentina Sosa
Enfermera profesional
valen.sosa@mail.com | 381 555-7890 | Banda del Río Salí, Tucumán
PERFIL
Enfermera profesional con 4 años de experiencia en internación y guardia.
EXPERIENCIA
2021 - actualidad · Enfermera · Sanatorio 9 de Julio
ESTUDIOS
Enfermera Profesional · Escuela de Enfermería UNT · Matrícula provincial vigente
HABILIDADES
Internación general, guardia, administración de medicación`,

  c8: `Nicolás Acosta
Chofer profesional
nico.acosta@mail.com | 11 5555-8901 | Morón, Buenos Aires
PERFIL
Chofer con 5 años de experiencia en reparto a comercios en zona oeste.
EXPERIENCIA
2020 - actualidad · Chofer de reparto · Distribuidora Oeste
ESTUDIOS
Secundario completo
HABILIDADES
Licencia profesional vigente, reparto, conocimiento de zona oeste`,

  c9: `Florencia Díaz
Analista de selección
flor.diaz@mail.com | 351 555-9012 | Córdoba Capital, Córdoba
PERFIL
Psicóloga con 2 años en selección de personal masivo y mandos medios.
EXPERIENCIA
2023 - actualidad · Analista de selección · Consultora Centro
ESTUDIOS
Licenciatura en Psicología · Universidad Nacional de Córdoba
HABILIDADES
Entrevistas por competencias, LinkedIn Recruiter, búsquedas masivas`,

  c10: `Tomás Villalba
Cocinero
tomas.villalba@mail.com | 261 555-0123 | Godoy Cruz, Mendoza
PERFIL
Cocinero con 5 años de experiencia en restaurantes de cocina de autor.
EXPERIENCIA
2021 - actualidad · Cocinero · Bodega Restaurante Andes
2019 - 2021 · Ayudante de cocina · Hotel Aconcagua
ESTUDIOS
Técnico en Gastronomía · Instituto Gato Dumas Mendoza
HABILIDADES
Mise en place, cocina de autor, manipulación de alimentos`,

  c11: `Agustina Medina
Recepcionista
agus.medina@mail.com | 381 555-1122 | San Miguel de Tucumán, Tucumán
PERFIL
Busco mi primer empleo formal en oficina. Experiencia en atención al público en comercio familiar.
EXPERIENCIA
2025 - actualidad · Atención al público · Kiosco familiar
ESTUDIOS
Secundario completo · Bachiller en Economía
HABILIDADES
Atención al público, Excel básico, inglés intermedio, disponibilidad inmediata`,

  c12: `Federico Luna
Técnico de mantenimiento
fede.luna@mail.com | 381 555-3344 | Tafí Viejo, Tucumán
PERFIL
Técnico electromecánico con 2 años en mantenimiento industrial.
EXPERIENCIA
2024 - actualidad · Técnico de mantenimiento · Citrícola del Valle
Mantenimiento de motores, tableros y redes eléctricas de planta.
ESTUDIOS
Técnico Electromecánico · Escuela Técnica N.º 3
HABILIDADES
Electricidad industrial, mecánica, soldadura`,

  c13: `Rocío Juárez
Administrativa contable
rocio.juarez@mail.com | 381 555-4411 | San Miguel de Tucumán, Tucumán
PERFIL
Administrativa contable con 3 años de experiencia en estudio contable. Organizada y responsable.
EXPERIENCIA
2023 - actualidad · Administrativa contable · Estudio Contable Gramajo
Registraciones, conciliaciones bancarias, liquidación de IVA e ingresos brutos.
ESTUDIOS
Estudiante de Contador Público (5to año) · Universidad Nacional de Tucumán
HABILIDADES
Excel intermedio, Tango Gestión, AFIP, Holistor`,

  c14: `Matías Herrera
Help desk
matias.herrera@mail.com | 381 555-4422 | San Miguel de Tucumán, Tucumán
PERFIL
Estudiante de Ingeniería en Sistemas con experiencia en soporte a usuarios. Buena comunicación y paciencia con usuarios no técnicos.
EXPERIENCIA
2025 - actualidad · Help desk · Call center Norte
Soporte telefónico y remoto en Windows, reseteo de cuentas y configuración de redes wifi.
ESTUDIOS
Estudiante de Ingeniería en Sistemas (3er año) · UTN Tucumán
HABILIDADES
Windows, redes, Office 365, TeamViewer`,

  c15: `Paula Ibáñez
Vendedora de salón
paula.ibanez@mail.com | 381 555-4433 | Yerba Buena, Tucumán
PERFIL
Vendedora con 2 años de experiencia en tienda de indumentaria. Cumplimiento de objetivos mensuales.
EXPERIENCIA
2024 - actualidad · Vendedora · Tienda Urbana
Atención al público, caja y reposición.
ESTUDIOS
Secundario completo
HABILIDADES
Ventas, atención al público, caja`,

  c16: `Gonzalo Ruiz
Ejecutivo de cuentas
gonzalo.ruiz@mail.com | 387 555-4444 | Salta Capital, Salta
PERFIL
Ejecutivo comercial con 7 años de experiencia en ventas B2B de insumos para la industria y el agro.
EXPERIENCIA
2021 - actualidad · Ejecutivo de cuentas · Agroinsumos del Norte
Gestión de cartera en Salta, Jujuy y Tucumán. Seguimiento en CRM Salesforce.
2019 - 2021 · Vendedor técnico · Ferretería Industrial Salta
ESTUDIOS
Licenciatura en Administración · Universidad Católica de Salta
HABILIDADES
Salesforce, negociación, Excel. Licencia de conducir y auto propio.`,

  c17: `Micaela Torres
Liquidadora de sueldos
mica.torres@mail.com | 381 555-4455 | San Miguel de Tucumán, Tucumán
PERFIL
Liquidadora de sueldos junior con 2 años de experiencia en pymes.
EXPERIENCIA
2024 - actualidad · Liquidadora de sueldos · Estudio Paz
Liquidación de 80 empleados bajo convenio de Comercio. F.931.
ESTUDIOS
Técnica en Administración de Personal · Instituto Belgrano
HABILIDADES
Tango Sueldos, convenio de Comercio, Excel`,

  c18: `Ezequiel Pereyra
Diseñador gráfico
eze.pereyra@mail.com | 381 555-4466 | Yerba Buena, Tucumán
PERFIL
Diseñador gráfico con 3 años armando piezas para redes de comercios locales. Redacción de textos cortos para publicaciones.
EXPERIENCIA
2023 - actualidad · Diseñador freelance · Comercios de Tucumán
Piezas para Instagram, flyers y catálogos.
ESTUDIOS
Diseño Gráfico (en curso) · Universidad San Pablo-T
HABILIDADES
Photoshop, Illustrator, Canva, Instagram`,

  c19: `Carla Benítez
Secretaria administrativa
carla.benitez@mail.com | 381 555-4477 | San Miguel de Tucumán, Tucumán
PERFIL
Secretaria administrativa con 8 años de experiencia. Muy organizada, a cargo de agenda de directorio y facturación.
EXPERIENCIA
2018 - actualidad · Secretaria administrativa · Grupo Constructor Norte
Tareas administrativas, facturación, pagos a proveedores y agenda de gerencia.
ESTUDIOS
Técnica Superior en Administración · Instituto San Martín
HABILIDADES
Excel avanzado, Word, facturación, agenda`,

  c20: `Leandro Castro
Cajero
lean.castro@mail.com | 381 555-4488 | Banda del Río Salí, Tucumán
PERFIL
Cajero de supermercado. Busco crecer en un puesto de oficina.
EXPERIENCIA
2025 - actualidad · Cajero · Supermercado El Ahorro
ESTUDIOS
Secundario completo
HABILIDADES
Caja, atención al público`,

  c21: `Julieta Navarro
Estudiante de Contador Público
juli.navarro@mail.com | 381 555-4499 | Tafí Viejo, Tucumán
PERFIL
Busco mi primer empleo en un estudio contable para aplicar lo que estudio. Sin experiencia laboral formal.
ESTUDIOS
Estudiante de Contador Público (2do año) · Universidad Nacional de Tucumán
HABILIDADES
Excel intermedio, contabilidad básica`
};

/* Banco de talento: etiquetas, notas y favoritos de ejemplo (por persona). d = hace cuántos días se escribió la nota */
const SEED_BANK = {
  'c:c1':  { fav: true, tags: ['Excel avanzado', 'Recomendable'], notes: [{ t: 'Excelente entrevista. Muy prolija con la documentación y buena referencia del estudio.', d: 5 }] },
  'c:c11': { tags: ['Primer empleo', 'Inglés intermedio'], notes: [{ t: 'Buena actitud, le falta experiencia de oficina. Volver a contactar para puestos junior.', d: 2 }] },
  'c:c4':  { fav: true, tags: ['Liquidación de sueldos', 'Recomendable'], notes: [{ t: 'Muy sólido técnicamente. Prefiere modalidad híbrida.', d: 3 }] },
  'c:c19': { tags: ['Senior', 'Pretensión alta'], notes: [{ t: 'Pide un sueldo por encima de la banda junior. Ideal para puestos de coordinación.', d: 1 }] },
  'c:c12': { tags: ['Mantenimiento industrial'], notes: [{ t: 'No es perfil IT, pero sirve para búsquedas de mantenimiento.', d: 1 }] },
  'c:c16': { tags: ['Se muda a Tucumán', 'Ventas B2B'], notes: [{ t: 'Disponible desde noviembre.', d: 1 }] },
  'c:c13': { tags: ['Contable', 'Tango'] }
};
const BANK_TAG_SUGGESTIONS = ['Recomendable', 'Volver a contactar', 'Disponibilidad inmediata', 'Pretensión alta', 'Primer empleo', 'Senior', 'No recontratar'];

/* ================= SKILLS Y COMPETENCIAS =================
   Skills: conocimientos técnicos verificables (Excel, licencia, AutoCAD…).
   Competencias: habilidades blandas (no se verifican en un CV: se confirman en la entrevista). */
const COMPETENCIAS = ['Trabajo en equipo', 'Orientación al cliente', 'Organización', 'Comunicación', 'Proactividad', 'Responsabilidad',
  'Atención al detalle', 'Resolución de problemas', 'Negociación', 'Liderazgo', 'Adaptabilidad', 'Orientación a resultados'];
const AREA_SKILLS = {
  administracion: ['Excel', 'Word', 'Facturación', 'Atención telefónica', 'Gestión de agenda', 'Tango', 'Data entry'],
  finanzas: ['Excel', 'Tango', 'AFIP', 'Liquidación de sueldos', 'Conciliaciones bancarias', 'Holistor', 'SAP'],
  ventas: ['CRM', 'Negociación', 'Prospección', 'Licencia de conducir', 'Excel', 'Ventas B2B'],
  tecnologia: ['Windows', 'Redes', 'Hardware', 'Linux', 'React', 'TypeScript', 'Node.js', 'SQL', 'Git', 'Jira'],
  atencion: ['Atención al público', 'Caja', 'Manejo de reclamos', 'Inglés', 'Excel'],
  logistica: ['Licencia profesional', 'Autoelevador', 'Control de stock', 'Picking', 'Reparto'],
  salud: ['Matrícula vigente', 'Internación', 'Guardia', 'Administración de medicación'],
  gastronomia: ['Manipulación de alimentos', 'Mise en place', 'Cocina de autor', 'Barra', 'Atención de mesas'],
  oficios: ['Electricidad', 'Soldadura', 'Mecánica', 'Plomería', 'Lectura de planos'],
  produccion: ['Operación de máquinas', 'Control de calidad', 'Envasado', 'BPM'],
  marketing: ['Canva', 'Instagram', 'TikTok', 'Meta Ads', 'Photoshop', 'Redacción', 'Figma'],
  rrhh: ['Entrevistas por competencias', 'LinkedIn Recruiter', 'Búsquedas masivas', 'Liquidación de sueldos'],
  educacion: ['Planificación de clases', 'Inglés', 'Plataformas virtuales'],
  ingenieria: ['AutoCAD', 'Gestión de proyectos', 'Lean', 'Excel'],
  comex: ['Incoterms', 'SIM/Malvina', 'Inglés', 'Logística internacional', 'Documentación aduanera'],
  arquitectura: ['AutoCAD', 'Revit', 'SketchUp', 'Dirección de obra', 'Cómputo y presupuesto']
};
/* Skills (* = excluyente) y competencias de las vacantes de ejemplo */
const SEED_JOB_SKILLS = {
  j8:  [['Excel*', 'Facturación', 'Atención telefónica'], ['Organización', 'Atención al detalle', 'Comunicación']],
  j32: [['Excel*', 'Tango', 'AFIP'], ['Atención al detalle', 'Responsabilidad']],
  j6:  [['CRM*', 'Negociación', 'Licencia de conducir*'], ['Orientación a resultados', 'Negociación', 'Comunicación']],
  j12: [['Liquidación de sueldos*', 'Tango*', 'AFIP'], ['Atención al detalle', 'Responsabilidad']],
  j24: [['Instagram*', 'TikTok', 'Canva*', 'Redacción'], ['Proactividad', 'Comunicación']],
  j2:  [['Windows*', 'Redes', 'Hardware'], ['Orientación al cliente', 'Resolución de problemas', 'Comunicación']],
  j1:  [['React*', 'TypeScript*', 'Git'], ['Trabajo en equipo', 'Resolución de problemas']],
  j3:  [['Jira', 'SQL'], ['Atención al detalle']],
  j5:  [['Atención al público', 'Caja'], ['Orientación al cliente']],
  j9:  [['Inglés*', 'Atención telefónica'], ['Comunicación', 'Organización']],
  j10: [['Facturación*', 'Excel', 'Tango'], ['Organización']],
  j11: [['Excel*', 'Conciliaciones bancarias', 'Tango'], ['Atención al detalle']],
  j13: [['Atención al público', 'Redacción'], ['Orientación al cliente', 'Comunicación']],
  j15: [['Licencia profesional*', 'Reparto'], ['Responsabilidad']],
  j16: [['Picking', 'Autoelevador'], ['Trabajo en equipo']],
  j17: [['Matrícula vigente*', 'Internación'], ['Responsabilidad', 'Trabajo en equipo']],
  j19: [['Atención de mesas'], ['Orientación al cliente']],
  j20: [['Manipulación de alimentos*', 'Mise en place'], ['Trabajo en equipo']],
  j21: [['Electricidad*', 'Lectura de planos'], ['Resolución de problemas']],
  j22: [['Electricidad', 'Mecánica'], ['Proactividad']],
  j26: [['Entrevistas por competencias', 'Búsquedas masivas'], ['Comunicación', 'Organización']],
  j30: [['Atención telefónica'], ['Orientación al cliente']],
  j31: [['Excel*', 'Data entry'], ['Atención al detalle']],
  j33: [['Incoterms*', 'SIM/Malvina', 'Inglés'], ['Organización', 'Atención al detalle']],
  j34: [['AutoCAD*', 'Revit*', 'SketchUp'], ['Atención al detalle', 'Trabajo en equipo']]
};
const parseSkills = arr => arr.map(s => ({ n: s.replace(/\*$/, ''), must: /\*$/.test(s) }));
SEED_JOBS.forEach(j => { const d = SEED_JOB_SKILLS[j.id]; if (d) { j.skills = parseSkills(d[0]); j.comps = [...d[1]]; } });

/* Competencias que declararon los candidatos de ejemplo en el chat */
const SEED_CAND_COMPS = {
  c1: ['Organización', 'Atención al detalle', 'Responsabilidad'], c2: ['Resolución de problemas', 'Orientación al cliente'], c3: ['Negociación', 'Orientación a resultados', 'Comunicación'],
  c4: ['Atención al detalle', 'Responsabilidad'], c5: ['Proactividad', 'Comunicación'], c6: ['Trabajo en equipo', 'Resolución de problemas'], c7: ['Responsabilidad', 'Trabajo en equipo'],
  c8: ['Responsabilidad'], c9: ['Comunicación', 'Organización'], c10: ['Trabajo en equipo'], c11: ['Proactividad', 'Comunicación'], c12: ['Resolución de problemas'],
  c13: ['Atención al detalle', 'Organización'], c14: ['Orientación al cliente', 'Comunicación', 'Resolución de problemas'], c15: ['Orientación al cliente'],
  c16: ['Negociación', 'Orientación a resultados'], c17: ['Atención al detalle'], c18: ['Proactividad'], c19: ['Organización', 'Liderazgo'], c20: ['Responsabilidad'],
  c21: ['Proactividad', 'Responsabilidad'], c22: []
};
SEED_CANDIDATES.forEach(c => { c.comps = SEED_CAND_COMPS[c.id] || []; });

/* ---------- Monetización: dos planes en dólares + sitio web opcional ----------
   Básico: gestionar hasta 5 búsquedas activas. Pro: búsquedas ilimitadas, 5 anuncios destacados y la base de datos de empleá.
   Las cuentas nuevas arrancan con TRIAL_DAYS días de prueba del plan Pro. Precios por mes, en US$ (editables acá). */
// Cobros apagados por ahora: todas las cuentas usan todo gratis (sin planes, precios ni pagos). Poner true para volver a mostrarlos.
const BILLING = false;
const FREE_PLAN = { id: 'libre', name: 'empleá', price: 0, active: Infinity, feat: 0, base: true, color: 'bg-brand-soft', highlights: [] };
const PLANS = [
  { id: 'basico', name: 'Básico', price: 20, active: 5, feat: 0, base: false, tag: 'Para gestionar tus búsquedas en un solo lugar', color: 'bg-lilac',
    highlights: ['Hasta 5 búsquedas activas a la vez', 'Postulantes y CVs sin límite', 'Visor de CV, calificación y notas', 'Terna con link para tu cliente', 'Calendario de entrevistas', 'Mis candidatos: tu base con notas e historial'] },
  { id: 'pro', name: 'Pro', price: 30, active: Infinity, feat: 5, base: true, tag: 'Para destacar tus búsquedas y encontrar candidatos nuevos', color: 'bg-sun-soft', popular: true,
    highlights: ['Búsquedas activas ilimitadas', '5 anuncios destacados a la vez', 'Acceso a la base de datos de empleá, con CV y contacto', 'Todo lo del plan Básico'] }
];
// Cuenta sin plan (prueba vencida): puede ver todo, pero no publicar ni reactivar búsquedas
const EXPIRED_PLAN = { id: 'vencido', name: 'Sin plan', price: 0, active: 0, feat: 0, base: false, color: 'bg-surface', highlights: [] };
// Canales de origen de los postulantes (links por canal y pregunta al postularse)
const CHANNELS = [
  ['emplea', 'empleá', 'ph-globe-simple'], ['linkedin', 'LinkedIn', 'ph-linkedin-logo'], ['whatsapp', 'WhatsApp', 'ph-whatsapp-logo'],
  ['instagram', 'Instagram', 'ph-instagram-logo'], ['facebook', 'Facebook', 'ph-facebook-logo'], ['computrabajo', 'Computrabajo', 'ph-briefcase'],
  ['zonajobs', 'ZonaJobs', 'ph-briefcase'], ['referido', 'Me lo recomendaron', 'ph-users'], ['banco', 'Sumado desde Mis candidatos', 'ph-address-book'], ['importado', 'Importado por la consultora', 'ph-upload-simple'], ['hub', 'Recomendado por el Hub', 'ph-users-three'], ['otro', 'Otro', 'ph-dots-three-circle']
];
const WEBSITE_PRICE = 150;     // diseño y desarrollo del sitio web (pago único; dominio y hosting a cargo del cliente)
const FEATURE_DAYS = 15;       // duración de las destacadas compradas sueltas (solo quedan en cuentas viejas)
const TRIAL_DAYS = 14;         // prueba gratis del plan Pro
// Plan inicial de las cuentas de ejemplo (el resto arranca con la prueba de 14 días)
const SEED_PLANS = { 'Talento Norte': 'pro', 'Selecta RRHH': 'pro', 'Bit Solutions': 'pro', 'Clínica del Parque': 'pro', 'Logística Federal': 'basico' };
// Vacantes de ejemplo destacadas: 'plan' = incluida en el plan; número = días que le quedan a la destacada comprada
const SEED_FEATURED = { j8: 'plan', j24: 'plan', j17: 'plan', j1: 'plan', j33: 9, j15: 12 };

/* ---------- Profesiones para filtrar talento rápido ----------
   Una persona entra en una profesión por su área o por palabras de su puesto/skills. */
const PROFESSIONS = [
  { id: 'contables', label: 'Contables', icon: 'ph-calculator', areas: ['finanzas'], kw: ['contador', 'contable', 'liquidador', 'sueldos', 'impuest', 'tesorer'] },
  { id: 'abogados', label: 'Abogados', icon: 'ph-scales', areas: [], kw: ['abogad', 'legal', 'juridic', 'procurador', 'escriban'] },
  { id: 'marketing', label: 'Marketing', icon: 'ph-megaphone', areas: ['marketing'], kw: ['marketing', 'community', 'disenad', 'redes sociales'] },
  { id: 'medicos', label: 'Médicos', icon: 'ph-stethoscope', areas: [], kw: ['medico', 'medica', 'medicina', 'pediatr', 'cardiolog'] },
  { id: 'salud', label: 'Enfermería y salud', icon: 'ph-first-aid-kit', areas: ['salud'], kw: ['enfermer', 'kinesiolog', 'farmac', 'odontolog'], excl: ['medicos'] },
  { id: 'ingenieros', label: 'Ingenieros', icon: 'ph-gear-six', areas: ['ingenieria'], kw: ['ingenier'] },
  { id: 'arquitectos', label: 'Arquitectos', icon: 'ph-compass-tool', areas: ['arquitectura'], kw: ['arquitect'] },
  { id: 'sistemas', label: 'Sistemas / IT', icon: 'ph-code', areas: ['tecnologia'], kw: ['desarroll', 'programad', 'soporte tecnico', 'sistemas'] },
  { id: 'administrativos', label: 'Administrativos', icon: 'ph-folders', areas: ['administracion'], kw: ['administrativ', 'recepcionista', 'secretari'] },
  { id: 'ventas', label: 'Ventas', icon: 'ph-handshake', areas: ['ventas'], kw: ['vendedor', 'vendedora', 'comercial'] },
  { id: 'atencion', label: 'Atención al cliente', icon: 'ph-headset', areas: ['atencion'], kw: ['cajer', 'call center'] },
  { id: 'rrhh', label: 'RRHH', icon: 'ph-users-three', areas: ['rrhh'], kw: ['recursos humanos', 'seleccion', 'recruiter'] },
  { id: 'comex', label: 'Comex', icon: 'ph-globe-hemisphere-west', areas: ['comex'], kw: ['comercio exterior', 'aduan'] },
  { id: 'logistica', label: 'Logística', icon: 'ph-truck', areas: ['logistica'], kw: ['chofer', 'deposito'] },
  { id: 'oficios', label: 'Oficios', icon: 'ph-hammer', areas: ['oficios', 'produccion'], kw: ['electricista', 'tecnico de mantenimiento', 'operari'] },
  { id: 'gastronomia', label: 'Gastronomía', icon: 'ph-fork-knife', areas: ['gastronomia'], kw: ['cociner', 'mozo', 'moza'] },
  { id: 'docentes', label: 'Docentes', icon: 'ph-graduation-cap', areas: ['educacion'], kw: ['docente', 'profesor'] }
];

// Más perfiles en "Toda la plataforma" para que los filtros por profesión tengan ejemplos
SEED_CANDIDATES.push(
  { id: 'c23', name: 'Valentina Ruiz Díaz', headline: 'Abogada laboralista', area: 'legal', province: 'Tucumán', city: 'San Miguel de Tucumán', seniority: 'semi', skills: ['Derecho laboral', 'Convenios colectivos', 'Litigios'], email: 'vale.ruizdiaz@mail.com', phone: '381 555-4601' },
  { id: 'c24', name: 'Martín Albornoz', headline: 'Médico clínico', area: 'salud', province: 'Salta', city: 'Salta Capital', seniority: 'senior', skills: ['Clínica médica', 'Guardia', 'Medicina laboral'], email: 'martin.albornoz@mail.com', phone: '387 555-4602' },
  { id: 'c25', name: 'Florencia Paz', headline: 'Contadora pública', area: 'finanzas', province: 'Tucumán', city: 'Yerba Buena', seniority: 'semi', skills: ['Impuestos', 'Tango', 'AFIP', 'Balances'], email: 'flor.paz@mail.com', phone: '381 555-4603' },
  { id: 'c26', name: 'Ignacio Bulacio', headline: 'Ingeniero civil', area: 'ingenieria', province: 'Jujuy', city: 'San Salvador de Jujuy', seniority: 'semi', skills: ['AutoCAD', 'Dirección de obra', 'Cómputo y presupuesto'], email: 'nacho.bulacio@mail.com', phone: '388 555-4604' },
  { id: 'c27', name: 'Camila Juárez', headline: 'Abogada corporativa', area: 'legal', province: 'Córdoba', city: 'Córdoba Capital', seniority: 'senior', skills: ['Contratos', 'Sociedades', 'Inglés'], email: 'cami.juarez@mail.com', phone: '351 555-4605' }
);
Object.assign(SEED_CV, {
  c23: `Valentina Ruiz Díaz\nAbogada laboralista\nvale.ruizdiaz@mail.com | 381 555-4601 | San Miguel de Tucumán, Tucumán\nEXPERIENCIA\nAbogada asociada · Estudio Jurídico Frías (2019 - actualidad): juicios laborales, convenios colectivos y asesoramiento a pymes.\nESTUDIOS\nAbogada · Universidad Nacional de Tucumán`,
  c24: `Martín Albornoz\nMédico clínico\nmartin.albornoz@mail.com | 387 555-4602 | Salta Capital, Salta\nEXPERIENCIA\nMédico de guardia · Hospital San Bernardo (2014 - actualidad).\nMédico laboral · Consultora Salud Norte (2018 - actualidad): exámenes preocupacionales.\nESTUDIOS\nMédico · Universidad Nacional de Córdoba. Especialista en Clínica Médica.`,
  c25: `Florencia Paz\nContadora pública\nflor.paz@mail.com | 381 555-4603 | Yerba Buena, Tucumán\nEXPERIENCIA\nContadora · Estudio Contable Gramajo (2018 - actualidad): impuestos, balances y liquidaciones en Tango.\nESTUDIOS\nContadora Pública · Universidad Nacional de Tucumán`,
  c26: `Ignacio Bulacio\nIngeniero civil\nnacho.bulacio@mail.com | 388 555-4604 | San Salvador de Jujuy, Jujuy\nEXPERIENCIA\nJefe de obra · Constructora Andina (2017 - actualidad): dirección de obra, cómputo y presupuesto, AutoCAD.\nESTUDIOS\nIngeniero Civil · Universidad Nacional de Jujuy`,
  c27: `Camila Juárez\nAbogada corporativa\ncami.juarez@mail.com | 351 555-4605 | Córdoba Capital, Córdoba\nEXPERIENCIA\nAbogada senior · Estudio Bertoldi & Asoc. (2015 - actualidad): contratos comerciales y derecho societario.\nESTUDIOS\nAbogada · Universidad Nacional de Córdoba. Inglés avanzado.`
});
SEED_CANDIDATES.forEach(c => { c.comps = c.comps || []; });

/* Logos de "Empresas que confían en empleá" (pasarela de la portada).
   Para usar una imagen, agregá src (ruta dentro de assets/img o URL), por ejemplo { name: 'Agro Pampa', src: 'assets/img/logos/agro-pampa.svg' }.
   Sin src se muestra el nombre con su ícono. */
const TRUSTED = [
  { name: 'Talento Norte' }, { name: 'Bit Solutions' }, { name: 'Clínica del Parque' }, { name: 'Agro Pampa' },
  { name: 'Selecta RRHH' }, { name: 'Retail Plus' }, { name: 'Grupo Andino' }, { name: 'Logística Federal' },
  { name: 'Sabores del Sur' }, { name: 'Andes Energía' }, { name: 'Instituto Horizonte' }
];

/* Datos de ejemplo de los clientes de las consultoras demo (página del cliente en Búsquedas) */
const SEED_CLIENT_INFO = {
  'Estudio Contable Ruiz & Asoc.': { city: 'Yerba Buena', province: 'Tucumán', contactName: 'Carolina Ruiz, socia', contactPhone: '381 400-2211', contactEmail: 'cruiz@estudioruiz.com.ar', website: 'estudioruiz.com.ar', notes: 'Estudio contable con 25 años en Tucumán. Valoran prolijidad y manejo de AFIP. Prefieren recibir la terna los lunes y entrevistan presencial en Yerba Buena.' },
  'Insumos del Norte S.A.': { city: 'San Miguel de Tucumán', province: 'Tucumán', contactName: 'Marcelo Díaz, gerente comercial', contactPhone: '381 422-7710', contactEmail: 'mdiaz@insumosdelnorte.com.ar', website: 'insumosdelnorte.com.ar', notes: 'Distribuidora industrial. Buscan vendedores con cartera propia y movilidad.' },
  'Servicios Integrales NOA': { city: 'San Miguel de Tucumán', province: 'Tucumán', contactName: 'Paula Sosa, RRHH', contactPhone: '381 433-5520', contactEmail: 'rrhh@sinoa.com.ar', website: 'sinoa.com.ar' },
  'Bodega Valle Calchaquí': { city: 'Cafayate', province: 'Salta', contactName: 'Julián Torres, marketing', contactPhone: '387 410-3344', contactEmail: 'jtorres@bodegavalle.com.ar', website: 'bodegavalle.com.ar', notes: 'Bodega boutique. Les importa el portfolio y la experiencia en turismo del vino.' },
  'Azucarera del Valle': { city: 'Salta Capital', province: 'Salta', contactName: 'Laura Méndez, jefa de personal', contactPhone: '387 421-9090', contactEmail: 'lmendez@azucareradelvalle.com.ar' },
  'Pagos Rápidos': { city: 'Rosario', province: 'Santa Fe', contactName: 'Tomás Gil, CTO', contactEmail: 'tgil@pagosrapidos.com', website: 'pagosrapidos.com' },
  'Grupo Inversor Plata': { city: 'Microcentro', province: 'CABA', contactName: 'Andrea Paz', contactEmail: 'apaz@grupoplata.com.ar' },
  'Distribuidora Mediterránea': { city: 'Córdoba Capital', province: 'Córdoba', contactName: 'Hernán López', contactPhone: '351 455-1200' },
  'Contacto Córdoba': { city: 'Córdoba Capital', province: 'Córdoba', contactName: 'Vanesa Ruiz, operaciones', contactPhone: '351 470-8800' },
  'Aseguradora del Plata': { city: 'La Plata', province: 'Buenos Aires', contactName: 'Diego Ferrer', contactEmail: 'dferrer@aseguradoraplata.com.ar' },
  'Agroexport Litoral': { city: 'Rosario', province: 'Santa Fe', contactName: 'Mariana Costa, comex', contactEmail: 'mcosta@agroexport.com.ar', website: 'agroexport.com.ar' }
};

/* ---------- Charla de café: notas y entrevistas con consultoras (ejemplos) ----------
   Se editan desde el panel de admin (Charla de café). img: 'lib:p1'…'lib:p6', 'lib:equipo' (fotos propias) o una imagen subida. */
const POST_CATS = [
  ['mitos', 'Mitos y verdades', 'ph-scales'], ['tendencias', 'Tendencias', 'ph-trend-up'],
  ['faq', 'Preguntas frecuentes', 'ph-question'], ['entrevistas', 'Entrevistas a consultoras', 'ph-microphone']
];
const SEED_POSTS = [
  { id: 'n1', cat: 'entrevistas', title: '“El CV abre la puerta, la entrevista es la casa”', excerpt: 'Charlamos con Talento Norte sobre cómo leen un CV en treinta segundos y qué hace que alguien pase a la entrevista.',
    consultora: 'Talento Norte', person: 'Laura Medina', role: 'Directora', img: 'lib:p3', daysAgo: 2, published: true,
    intro: 'Talento Norte trabaja hace más de diez años con empresas de Tucumán y el NOA. Nos sentamos a tomar un café con su directora para entender qué pasa del otro lado del aviso.',
    quote: 'Un CV claro de una página vale más que tres páginas de cursos sin contexto.',
    qa: [
      ['¿Cuánto tiempo le dedican a cada CV?', 'En la primera lectura, unos treinta segundos. Buscamos tres cosas: si la experiencia tiene que ver con el puesto, dónde vive la persona y si el CV se entiende rápido. Si eso está, lo leemos con calma.'],
      ['¿Qué hace que alguien pase a la entrevista?', 'Que se note que leyó el aviso. Cuando una persona ajusta dos o tres líneas de su perfil a lo que pedimos, se nota enseguida.'],
      ['¿Y qué los hace descartar a alguien de entrada?', 'Datos de contacto mal escritos. Parece mentira, pero nos pasa seguido: un número con un dígito de menos y no hay forma de ubicar a la persona.'],
      ['Un consejo para quien busca trabajo hoy', 'Que no se desanime si no lo llaman de la primera búsqueda. Muchas veces el perfil es bueno pero el cliente buscaba algo muy puntual, y lo tenemos en cuenta para la siguiente.']
    ] },
  { id: 'n2', cat: 'mitos', title: 'Mitos y verdades del CV: ¿una página o dos?', excerpt: 'Foto sí o no, cuántas páginas, si poner la pretensión salarial. Lo que de verdad importa según las consultoras.',
    consultora: 'Selecta RRHH', person: 'Martín Ríos', role: 'Consultor senior', img: 'lib:p1', daysAgo: 6, published: true,
    intro: 'Reunimos las dudas que más nos llegan sobre cómo armar un CV y se las llevamos a Selecta RRHH.',
    quote: 'No hay un formato perfecto: hay un CV que se entiende en un minuto.',
    qa: [
      ['“El CV tiene que tener una sola página.” ¿Mito o verdad?', 'A medias. Para perfiles con poca experiencia, una página alcanza y se agradece. Si tenés muchos años de trabajo, dos páginas están bien siempre que lo más importante esté en la primera.'],
      ['“Sin foto no te llaman.”', 'Mito. La foto no define nada. Si la ponés, que sea una foto clara y actual; si no la ponés, no pasa nada.'],
      ['“Hay que poner la pretensión salarial.”', 'Depende del aviso. Si la piden, ponela con un rango. Si no la piden, la charlamos en la entrevista.'],
      ['“Los CV en Word se leen peor.”', 'Mito. Leemos Word y PDF igual. Lo que recomendamos es PDF porque se ve igual en cualquier celular.']
    ] },
  { id: 'n3', cat: 'tendencias', title: 'Qué buscan las empresas tucumanas en 2026', excerpt: 'Perfiles más pedidos, habilidades que suman y por qué la disponibilidad horaria pesa cada vez más.',
    consultora: 'Talento Norte', person: 'Laura Medina', role: 'Directora', img: 'lib:p2', daysAgo: 11, published: true,
    intro: 'Las búsquedas cambian con la economía y con la forma de trabajar. Le preguntamos a Talento Norte qué están pidiendo hoy sus clientes.',
    quote: 'Las habilidades blandas ya no son un plus: son lo primero que nos piden.',
    qa: [
      ['¿Cuáles son los perfiles más pedidos?', 'Administración y contabilidad, atención al cliente, ventas y logística. En salud, enfermería sigue siendo una de las búsquedas más difíciles de cubrir.'],
      ['¿Qué habilidades suman puntos?', 'Manejo de Excel, buena comunicación por escrito y saber trabajar con herramientas digitales simples. No hace falta ser experto: que la persona no le tenga miedo a aprender.'],
      ['¿El trabajo remoto llegó a Tucumán?', 'Más en modalidad híbrida que remota del todo. Muchas empresas piden dos o tres días en la oficina.'],
      ['¿Qué cambió en las entrevistas?', 'La primera charla suele ser por videollamada o por WhatsApp. La presencial queda para la etapa final.']
    ] },
  { id: 'n4', cat: 'faq', title: '¿Cuánto tarda una consultora en responder?', excerpt: 'Los tiempos reales de un proceso de selección, etapa por etapa, y qué podés hacer mientras esperás.',
    consultora: 'Selecta RRHH', person: 'Martín Ríos', role: 'Consultor senior', img: 'lib:p5', daysAgo: 16, published: true,
    intro: 'Es la pregunta que más nos hacen los candidatos. La respondemos con Selecta RRHH, paso por paso.',
    quote: 'Que no te llamen en una semana no quiere decir que quedaste afuera.',
    qa: [
      ['¿Cuánto dura un proceso de selección?', 'Entre dos y cuatro semanas en promedio. Depende mucho del cliente: algunos deciden rápido y otros necesitan varias entrevistas.'],
      ['¿Cuándo leen mi CV?', 'En los primeros días después de cerrar la recepción. En empleá ves el momento exacto en que lo abrimos.'],
      ['Si no me eligen, ¿me avisan?', 'Debería ser siempre así. Con empleá avisamos a todos los descartados juntos, y lo ves en tus postulaciones.'],
      ['¿Puedo escribir para preguntar cómo va?', 'Sí, una vez y con tranquilidad. Un mensaje corto por WhatsApp está perfecto.']
    ] },
  { id: 'n5', cat: 'mitos', title: '¿Las consultoras le cobran al candidato?', excerpt: 'Un mito que se repite y que conviene aclarar: quién paga un proceso de selección y cómo detectar avisos falsos.',
    consultora: 'Talento Norte', person: 'Laura Medina', role: 'Directora', img: 'lib:p4', daysAgo: 22, published: true,
    intro: 'Cada tanto aparecen avisos que piden plata para “reservar un puesto”. Lo hablamos con Talento Norte.',
    quote: 'Si te piden plata para postularte, no es una búsqueda real.',
    qa: [
      ['¿El candidato paga algo?', 'Nunca. Las consultoras cobran a la empresa que las contrata. Postularte, hacer entrevistas y quedar seleccionado no te cuesta nada.'],
      ['¿Cómo detecto un aviso falso?', 'Desconfiá si te piden pagar un curso obligatorio, un “material de trabajo” o datos de tu tarjeta. Una consultora seria nunca te pide eso.'],
      ['¿Qué hago si me pasa?', 'No pagues, guardá la conversación y denunciá el aviso. En empleá podés escribirnos desde la página de Privacidad o por WhatsApp.']
    ] },
  { id: 'n6', cat: 'tendencias', title: 'Entrevistas por videollamada: llegaron para quedarse', excerpt: 'Cómo prepararte para una entrevista desde el celular o la compu, y los errores más comunes.',
    consultora: 'Selecta RRHH', person: 'Martín Ríos', role: 'Consultor senior', img: 'lib:p6', daysAgo: 30, published: true,
    intro: 'Más de la mitad de las primeras entrevistas ya son por videollamada. Selecta RRHH nos dejó sus consejos.',
    quote: 'Conectate cinco minutos antes: es la mejor primera impresión.',
    qa: [
      ['¿Qué es lo más importante?', 'La conexión y el sonido. Una imagen perfecta no sirve si no se escucha bien.'],
      ['¿Celular o computadora?', 'Cualquiera de los dos. Si usás el celular, apoyalo en algo firme y en posición horizontal.'],
      ['¿Qué errores ven seguido?', 'Ruido de fondo, luz a la espalda y no tener el CV a mano para responder sobre fechas.']
    ] }
];

/* ---------- Preguntas filtro ----------
   Cada búsqueda puede tener hasta 3. type: 'yn' (Sí/No) u 'opt' (opciones). must: excluyente; ok: la respuesta que hace falta. */
const QUESTION_SUGGESTIONS = [
  { text: '¿Tenés disponibilidad full time?', type: 'yn', must: true, ok: 'Sí' },
  { text: '¿Tenés carnet de conducir?', type: 'yn', must: true, ok: 'Sí' },
  { text: '¿Podés trabajar fines de semana?', type: 'yn', must: false, ok: 'Sí' },
  { text: '¿Tenés movilidad propia?', type: 'yn', must: false, ok: 'Sí' },
  { text: '¿Qué disponibilidad horaria tenés?', type: 'opt', options: ['Mañana', 'Tarde', 'Full time'], must: false, ok: 'Full time' },
  { text: '¿Cuándo podrías empezar?', type: 'opt', options: ['Ya mismo', 'En 15 días', 'En un mes o más'], must: false, ok: 'Ya mismo' }
];
// Preguntas de ejemplo para algunas búsquedas de la demo (también para las copias de "cargar ejemplos")
const SEED_JOB_QUESTIONS = {
  j8: [{ id: 'q1', text: '¿Tenés disponibilidad full time?', type: 'yn', must: true, ok: 'Sí' }, { id: 'q2', text: '¿Qué nivel de Excel tenés?', type: 'opt', options: ['Básico', 'Intermedio', 'Avanzado'], must: false, ok: 'Intermedio' }],
  j15: [{ id: 'q1', text: '¿Tenés carnet de conducir profesional?', type: 'yn', must: true, ok: 'Sí' }]
};

// Hub: pedidos "Busco perfil" de otros selectores (cada uno va atado a una búsqueda abierta)
const SEED_HUB_REQS = [
  { id: 'h1', company: 'Selecta RRHH', jobId: 'j11', daysAgo: 1, note: 'Necesitamos alguien con Tango y conciliaciones bancarias. Si tenés un buen perfil que quedó afuera de una búsqueda tuya, nos sirve mucho.' },
  { id: 'h2', company: 'Grupo Andino', jobId: 'j22', daysAgo: 2, note: 'Buscamos técnico/a con experiencia en mantenimiento preventivo, ideal con conocimientos de electricidad.' },
  { id: 'h3', company: 'Selecta RRHH', jobId: 'j31', daysAgo: 3, note: 'Carga de datos con buen manejo de Excel. Valoramos rapidez y prolijidad.' },
  { id: 'h4', company: 'Talento Norte', jobId: 'j8', daysAgo: 4, note: 'Perfil administrativo para un estudio contable. Disponibilidad full time.' },
  { id: 'h5', company: 'Clínica del Parque', jobId: 'j17', daysAgo: 5, note: 'Enfermero/a con matrícula para turno noche.' }
];
