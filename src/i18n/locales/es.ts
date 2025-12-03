/**
 * Spanish translations
 */
export const es = {
    // Header
    'header.title': 'Asistente Claude Code',
    'header.noNoteSelected': 'ninguna nota seleccionada',

    // Input Section
    'input.label': 'Tus instrucciones:',
    'input.placeholder': 'ej., "Agregar más ejemplos a esta sección" o "Reorganizar con mejores encabezados" (Enter para enviar, Ctrl+Enter para nueva línea)',
    'input.conversationalMode': 'modo conversacional (sin edición de archivos)',
    'input.conversationalModeTooltip': 'Chatea con Claude sin modificar ningún archivo',
    'input.selectedTextOnly': 'Editar solo texto seleccionado',
    'input.autoAccept': 'Aceptar cambios automáticamente',
    'input.modelLabel': 'Modelo:',
    'input.modelDefault': 'Predeterminado',
    'input.runButton': 'Ejecutar Claude Code',
    'input.runningButton': 'Ejecutando...',
    'input.cancelButton': 'Cancelar',

    // Result Section
    'result.title': 'Resultado',

    // Output Section
    'output.title': 'Salida',

    // Preview Section
    'preview.title': 'Vista previa',
    'preview.tabRaw': 'Sin formato',
    'preview.tabDiff': 'Diferencias',
    'preview.tabRendered': 'Renderizado',
    'preview.originalChars': 'Original:',
    'preview.modifiedChars': 'Modificado:',
    'preview.chars': 'caracteres',
    'preview.applyButton': 'aplicar cambios',
    'preview.rejectButton': 'rechazar',

    // History Section
    'history.title': 'Historial',
    'history.clearButton': 'Limpiar',

    // Agent Section
    'agent.planTitle': 'plan',
    'agent.activityTitle': 'Actividad',
    'agent.noPlan': 'Aún no se ha creado un plan',

    // Todo Status
    'todo.pending': 'pendiente',
    'todo.inProgress': 'en progreso',
    'todo.completed': 'completado',

    // Interactive Prompt
    'interactive.header': 'Claude está solicitando confirmación',
    'interactive.yesButton': 'sí',
    'interactive.noButton': 'no',
    'interactive.customPlaceholder': 'O escribe una respuesta personalizada...',

    // Permission Approval
    'permission.header': 'permiso requerido',
    'permission.message': 'Claude está solicitando permiso para ejecutar acciones.',
    'permission.approveButton': 'aprobar y continuar',
    'permission.denyButton': 'denegar',

    // Status Messages
    'status.processing': 'Claude está procesando',
    'status.autoApplying': 'Aplicando cambios automáticamente...',
    'status.runningAuthorized': 'Ejecutando tareas autorizadas',
    'status.failed': 'Falló - ver error abajo',

    // Notifications
    'notice.alreadyProcessing': 'Ya se está procesando una solicitud. Por favor espera.',
    'notice.enterPrompt': 'Por favor ingresa una instrucción',
    'notice.noActiveNote': 'No se encontró una nota activa, por favor abre una nota Markdown primero',
    'notice.noEditor': 'No se encontró un editor Markdown, asegúrate de tener una nota abierta',
    'notice.noVaultPath': 'No se pudo determinar la ruta de la bóveda',
    'notice.completed': 'Claude Code completado',
    'notice.completedNoChanges': 'Claude Code completado (sin cambios en archivos)',
    'notice.changesApplied': 'cambios aplicados automáticamente',
    'notice.changesAppliedSuccess': 'cambios aplicados exitosamente',
    'notice.failedApplyChanges': 'falló al aplicar cambios',
    'notice.changesRejected': 'Cambios rechazados',
    'notice.cancelled': 'Cancelado',
    'notice.permissionRequest': 'Claude está solicitando permiso - por favor aprueba o deniega',
    'notice.permissionDenied': 'Permiso denegado - Claude no procederá',
    'notice.noChangesToApply': 'no hay cambios para aplicar',
    'notice.noActiveFile': 'no hay archivo activo',
    'notice.historyRestored': 'Elemento del historial restaurado',
    'notice.historyRestoredWithChanges': 'Elemento del historial restaurado con cambios propuestos',
    'notice.historyCleared': 'Historial limpiado',

    // Diff View
    'diff.original': 'Original',
    'diff.modified': 'Modificado',

    // Settings
    'settings.autoDetectPath': 'Auto-detectar ruta de Claude Code',
    'settings.autoDetectPathDesc': 'Detectar automáticamente la ubicación del ejecutable de Claude Code',
    'settings.executablePath': 'Ruta del ejecutable de Claude Code',
    'settings.executablePathDesc': 'Ruta completa al ejecutable de Claude Code (ej., /usr/local/bin/claude)',
    'settings.testInstallation': 'Probar instalación de Claude Code',
    'settings.testInstallationDesc': 'Verificar que Claude Code sea accesible y funcione',
    'settings.testButton': 'Probar',
    'settings.testWorking': '¡funcionando!',
    'settings.testFailed': 'falló',
    'settings.customPrompt': 'Prompt de sistema personalizado',
    'settings.customPromptDesc': 'Prompt de sistema personalizado opcional para agregar a todas las solicitudes',
    'settings.customPromptPlaceholder': 'Estás ayudando a editar notas markdown...',
    'settings.preserveCursor': 'Preservar posición del cursor',
    'settings.preserveCursorDesc': 'Intentar mantener la posición del cursor después de aplicar cambios',
    'settings.autoAcceptChanges': 'Aceptar cambios automáticamente',
    'settings.autoAcceptChangesDesc': 'Aplicar cambios automáticamente sin mostrar vista previa (¡usar con precaución!)',
    'settings.model': 'Modelo',
    'settings.modelDesc': 'Selecciona el modelo de Claude a usar: Sonnet (equilibrado), Opus (más capaz), o Haiku (más rápido). Dejar vacío para usar el modelo de subagente predeterminado.',
    'settings.modelDefault': 'Predeterminado (modelo subagente)',
    'settings.modelSonnet': 'Sonnet (equilibrado)',
    'settings.modelOpus': 'Opus (más capaz)',
    'settings.modelHaiku': 'Haiku (más rápido)',
    'settings.vaultAccess': 'Permitir acceso a toda la bóveda',
    'settings.vaultAccessDesc': 'Permitir a Claude leer/buscar otros archivos en tu bóveda (no solo la nota actual)',
    'settings.permissionlessMode': 'Habilitar modo sin permisos',
    'settings.permissionlessModeDesc': 'Permitir a Claude ejecutar acciones sin pedir permiso cada vez (¡usar con precaución! Claude tendrá control total)',
    'settings.timeout': 'Tiempo de espera (segundos)',
    'settings.timeoutDesc': 'Tiempo máximo de espera para la respuesta de Claude Code (0 = sin límite)',
    'settings.customApiConfig': 'Configuración de API personalizada',
    'settings.customApiConfigDesc': 'Configurar endpoints de API personalizados para regiones donde Claude no está disponible directamente. Dejar vacío para usar la configuración predeterminada.',
    'settings.apiBaseUrl': 'URL base de API',
    'settings.apiBaseUrlDesc': 'URL del endpoint de API personalizado (ej., https://api.kimi.com/coding/)',
    'settings.apiAuthToken': 'Token de autenticación de API',
    'settings.apiAuthTokenDesc': 'Token de autenticación personalizado para el endpoint de API',
    'settings.apiAuthTokenPlaceholder': 'Ingresa tu token de API',
    'settings.customModel': 'Modelo personalizado',
    'settings.customModelDesc': 'Nombre del modelo personalizado a usar (ej., kimi-for-coding). Sobrescribe el selector de modelo anterior.',
    'settings.customSmallModel': 'Modelo pequeño/rápido personalizado',
    'settings.customSmallModelDesc': 'Nombre del modelo personalizado para operaciones rápidas (ej., kimi-for-coding)',
    'settings.language': 'Idioma',
    'settings.languageDesc': 'Seleccionar idioma de la interfaz',
};