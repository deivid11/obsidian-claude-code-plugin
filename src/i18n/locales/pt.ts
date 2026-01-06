/**
 * Portuguese translations
 */
export const pt = {
    // Header
    'header.title': 'Assistente Claude Code',
    'header.noNoteSelected': 'Nenhuma nota selecionada',

    // Input Section
    'input.label': 'Suas instruções:',
    'input.placeholder': 'ex., "Adicione mais exemplos a esta seção" ou "Reorganize com melhores títulos" (Enter para enviar, Ctrl+Enter para nova linha)',
    'input.conversationalMode': 'Modo conversacional (sem edição de arquivos)',
    'input.conversationalModeTooltip': 'Converse com Claude sem modificar arquivos',
    'input.selectedTextOnly': 'Editar apenas texto selecionado',
    'input.autoAccept': 'Aceitar alterações automaticamente',
    'input.modelLabel': 'Modelo:',
    'input.modelDefault': 'Padrão',
    'input.runButton': 'Executar Claude Code',
    'input.runningButton': 'Executando...',
    'input.cancelButton': 'Cancelar',

    // Result Section
    'result.title': 'Resultado',

    // Output Section
    'output.title': 'Saída',

    // Preview Section
    'preview.title': 'Visualização',
    'preview.tabRaw': 'Bruto',
    'preview.tabDiff': 'Diferenças',
    'preview.tabRendered': 'Renderizado',
    'preview.originalChars': 'Original:',
    'preview.modifiedChars': 'Modificado:',
    'preview.chars': 'caracteres',
    'preview.applyButton': 'Aplicar alterações',
    'preview.rejectButton': 'Rejeitar',

    // History Section
    'history.title': 'Histórico',
    'history.clearButton': 'Limpar',

    // Agent Section
    'agent.planTitle': 'Plano',
    'agent.activityTitle': 'Atividade',
    'agent.noPlan': 'Nenhum plano criado ainda',

    // Todo Status
    'todo.pending': 'Pendente',
    'todo.inProgress': 'Em progresso',
    'todo.completed': 'Concluído',

    // Interactive Prompt
    'interactive.header': 'Claude está pedindo confirmação',
    'interactive.yesButton': 'Sim',
    'interactive.noButton': 'Não',
    'interactive.customPlaceholder': 'Ou digite uma resposta personalizada...',

    // Permission Approval
    'permission.header': 'Permissão necessária',
    'permission.message': 'Claude está solicitando permissão para executar ações.',
    'permission.approveButton': 'Aprovar e continuar',
    'permission.denyButton': 'Negar',

    // Status Messages
    'status.processing': 'Claude está processando',
    'status.autoApplying': 'Aplicando alterações automaticamente...',
    'status.runningAuthorized': 'Executando tarefas autorizadas',
    'status.runningInBackground': 'Executando em segundo plano...',
    'status.failed': 'Falhou - veja o erro abaixo',

    // Notifications
    'notice.alreadyProcessing': 'Já está processando uma solicitação. Por favor, aguarde.',
    'notice.enterPrompt': 'Por favor, insira um prompt',
    'notice.noActiveNote': 'Nenhuma nota ativa encontrada, por favor abra uma nota Markdown primeiro',
    'notice.noEditor': 'Nenhum editor Markdown encontrado, certifique-se de que você tem uma nota aberta',
    'notice.noVaultPath': 'Não foi possível determinar o caminho do vault',
    'notice.completed': 'Claude Code concluído',
    'notice.completedNoChanges': 'Claude Code concluído (sem alterações de arquivo)',
    'notice.changesApplied': 'Alterações aplicadas automaticamente',
    'notice.changesAppliedSuccess': 'Alterações aplicadas com sucesso',
    'notice.failedApplyChanges': 'Falha ao aplicar alterações',
    'notice.changesRejected': 'Alterações rejeitadas',
    'notice.cancelled': 'Cancelado',
    'notice.permissionRequest': 'Claude está solicitando permissão - por favor aprove ou negue',
    'notice.permissionDenied': 'Permissão negada - Claude não prosseguirá',
    'notice.noChangesToApply': 'Nenhuma alteração para aplicar',
    'notice.noActiveFile': 'Nenhum arquivo ativo',
    'notice.historyRestored': 'Item do histórico restaurado',
    'notice.historyRestoredWithChanges': 'Item do histórico restaurado com alterações propostas',
    'notice.historyCleared': 'Histórico limpo',

    // Diff View
    'diff.original': 'Original',
    'diff.modified': 'Modificado',

    // Result Renderer
    'result.directAnswer': 'Resposta direta',
    'result.additionalContext': 'Contexto adicional',
    'result.tokens': 'tokens',
    'result.tokensIn': 'entrada',
    'result.tokensOut': 'saída',

    // Preview Stats
    'preview.originalLabel': 'Original:',
    'preview.modifiedLabel': 'Modificado:',
    'preview.charsLabel': 'caracteres',

    // Misc
    'misc.noPendingRequest': 'Nenhuma solicitação pendente encontrada',
    'misc.languageChanged': 'Idioma alterado. Alguns elementos da interface serão atualizados ao recarregar.',
    'misc.testFailed': 'Teste do Claude Code falhou',

    // Settings
    'settings.autoDetectPath': 'Detectar caminho do Claude Code automaticamente',
    'settings.autoDetectPathDesc': 'Detectar automaticamente a localização do executável do Claude Code',
    'settings.executablePath': 'Caminho do executável do Claude Code',
    'settings.executablePathDesc': 'Caminho completo para o executável do Claude Code (ex., /usr/local/bin/claude)',
    'settings.testInstallation': 'Testar instalação do Claude Code',
    'settings.testInstallationDesc': 'Verificar se o Claude Code está acessível e funcionando',
    'settings.testButton': 'Testar',
    'settings.testWorking': 'Funcionando!',
    'settings.testFailed': 'Falhou',
    'settings.customPrompt': 'Prompt de sistema personalizado',
    'settings.customPromptDesc': 'Prompt de sistema personalizado opcional para adicionar a todas as solicitações',
    'settings.customPromptPlaceholder': 'Você está ajudando a editar notas markdown...',
    'settings.preserveCursor': 'Preservar posição do cursor',
    'settings.preserveCursorDesc': 'Tentar manter a posição do cursor após aplicar alterações',
    'settings.autoAcceptChanges': 'Aceitar alterações automaticamente',
    'settings.autoAcceptChangesDesc': 'Aplicar alterações automaticamente sem mostrar visualização (use com cautela!)',
    'settings.model': 'Modelo',
    'settings.modelDesc': 'Selecione o modelo Claude a usar: Sonnet (equilibrado), Opus (mais capaz), ou Haiku (mais rápido). Deixe vazio para usar o modelo subagent padrão.',
    'settings.modelDefault': 'Padrão (modelo subagent)',
    'settings.modelSonnet': 'Sonnet (equilibrado)',
    'settings.modelOpus': 'Opus (mais capaz)',
    'settings.modelHaiku': 'Haiku (mais rápido)',
    'settings.vaultAccess': 'Permitir acesso ao vault completo',
    'settings.vaultAccessDesc': 'Permitir que Claude leia/pesquise outros arquivos no seu vault (não apenas a nota atual)',
    'settings.permissionlessMode': 'Habilitar modo sem permissões',
    'settings.permissionlessModeDesc': 'Permitir que Claude execute ações sem pedir permissão a cada vez (use com cautela! Claude terá controle total)',
    'settings.timeout': 'Tempo limite (segundos)',
    'settings.timeoutDesc': 'Tempo máximo para aguardar resposta do Claude Code (0 = sem limite)',
    'settings.customApiConfig': 'Configuração de API personalizada',
    'settings.customApiConfigDesc': 'Configure endpoints de API personalizados para regiões onde Claude não está disponível diretamente. Deixe vazio para usar configurações padrão.',
    'settings.apiBaseUrl': 'URL base da API',
    'settings.apiBaseUrlDesc': 'URL do endpoint de API personalizado (ex., https://api.kimi.com/coding/)',
    'settings.apiAuthToken': 'Token de autenticação da API',
    'settings.apiAuthTokenDesc': 'Token de autenticação personalizado para o endpoint da API',
    'settings.apiAuthTokenPlaceholder': 'Insira seu token de API',
    'settings.customModel': 'Modelo personalizado',
    'settings.customModelDesc': 'Nome do modelo personalizado a usar (ex., kimi-for-coding). Substitui a seleção de modelo acima.',
    'settings.customSmallModel': 'Modelo pequeno/rápido personalizado',
    'settings.customSmallModelDesc': 'Nome do modelo personalizado para operações rápidas (ex., kimi-for-coding)',
    'settings.language': 'Idioma',
    'settings.languageDesc': 'Selecione o idioma da interface',
};