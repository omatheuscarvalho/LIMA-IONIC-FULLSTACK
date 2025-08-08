# LIMA - Leaf Image Measurement and Analysis

<p align="center">
  <img src="src/assets/icon/favicon.png" alt="LIMA Logo" width="200"/>
</p>

## 📱 Sobre o Projeto

LIMA (Leaf Image Measurement and Analysis) é uma aplicação móvel multiplataforma desenvolvida com Ionic e Capacitor que permite aos pesquisadores e profissionais da área a realizar medições precisas em folhas de plantas através de imagens. O aplicativo facilita a coleta, análise e exportação de dados morfométricos de folhas, auxiliando em estudos de fisiologia vegetal, fitopatologia e melhoramento genético.

## ✨ Funcionalidades

- **Interface Intuitiva**: Design moderno e responsivo com componentes Ionic
- **Seleção de Imagens**: Interface para seleção de imagens (atualmente simulada para demonstração)
- **Medições Configuráveis**: Selecione quais medidas calcular:
  - Área foliar (cm²)
  - Perímetro (cm)
  - Comprimento (cm)
  - Largura (cm)
  - Relação largura/comprimento
- **Calibração por Escala**: Sistema de calibração baseado em área de referência
- **Organização de Dados**: Categorização por espécie, tratamento e réplica
- **Análise Estatística**: Cálculos automáticos de:
  - Soma das áreas
  - Média e desvio padrão
  - Relação largura/comprimento média
- **Exportação Avançada**: Export CSV com metadados completos e resultados agregados
- **Histórico Persistente**: Armazenamento local de até 50 análises recentes
- **Gerenciamento de Histórico**: Visualização detalhada, exportação individual e limpeza de dados
- **Tema Adaptativo**: Modo escuro/claro com detecção automática de preferências do sistema
- **Arquitetura Moderna**: Utiliza Angular Standalone Components para melhor performance

## 🚀 Tecnologias

- [Ionic Framework](https://ionicframework.com/) v8.0.0
- [Angular](https://angular.io/) v19.0.0 (Standalone Components)
- [Capacitor](https://capacitorjs.com/) v7.2.0
- [TypeScript](https://www.typescriptlang.org/)
- [Ionicons](https://ionic.io/ionicons) v7.0.0 para ícones
- [PapaParse](https://www.papaparse.com/) v5.5.3 para processamento de CSV
- [File-Saver](https://github.com/eligrey/FileSaver.js) v2.0.5 para download de arquivos
- [RxJS](https://rxjs.dev/) v7.8.0 para programação reativa

## 📋 Pré-requisitos

- [Node.js](https://nodejs.org/) (v18 ou superior)
- [npm](https://www.npmjs.com/) (v9 ou superior)
- [Ionic CLI](https://ionicframework.com/docs/cli) (v7 ou superior)
- [Angular CLI](https://angular.io/cli) (v19 ou superior)
- [Android Studio](https://developer.android.com/studio) (para compilação Android)
- [Xcode](https://developer.apple.com/xcode/) (para compilação iOS, apenas em macOS)
- [Java JDK 11+](https://adoptium.net/) (para compilação Android)

## 🔧 Instalação

```bash
# Clone o repositório
git clone <link do repositório>
cd LIMA-ionic

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm start
# ou
ionic serve
```

## 📜 Scripts Disponíveis

```bash
# Desenvolvimento
npm start          # Inicia o servidor de desenvolvimento
npm run build      # Constrói o aplicativo para produção
npm run watch      # Constrói em modo watch para desenvolvimento
npm test           # Executa os testes unitários
npm run lint       # Executa o linter para verificar qualidade do código

# Capacitor (Mobile)
npx cap add android     # Adiciona plataforma Android
npx cap add ios         # Adiciona plataforma iOS
npx cap sync           # Sincroniza arquivos web com projetos nativos
npx cap open android   # Abre projeto no Android Studio
npx cap open ios       # Abre projeto no Xcode
```

## 📱 Compilação para Dispositivos Móveis

### Android

```bash
# Construa o aplicativo
ionic build

# Adicione a plataforma Android (se ainda não existir)
npx cap add android

# Copie os arquivos da web para o projeto nativo
npx cap sync android

# Abra o projeto no Android Studio
npx cap open android
```

### iOS (apenas em macOS)

```bash
# Construa o aplicativo
ionic build

# Adicione a plataforma iOS (se ainda não existir)
npx cap add ios

# Copie os arquivos da web para o projeto nativo
npx cap sync ios

# Abra o projeto no Xcode
npx cap open ios
```

## 📊 Fluxo de Trabalho

1. **Captura de Imagem**: Selecione uma imagem de folha (funcionalidade simulada)
2. **Calibração**: Defina a área do padrão de escala para garantir medições precisas
3. **Análise**: Execute o cálculo automático das medidas selecionadas
4. **Resultados**: Visualize os resultados individuais e agregados (soma, média, desvio padrão)
5. **Exportação**: Exporte os dados em formato CSV com metadados completos
6. **Histórico**: Acesse e gerencie análises anteriores na página de histórico
7. **Tema**: Alterne entre modo claro e escuro conforme sua preferência

## 🏗️ Estrutura do Projeto

```
LIMA-ionic/
├── src/
│   ├── app/
│   │   ├── home/           # Página principal com análise de folhas
│   │   ├── history/        # Página de histórico de análises
│   │   ├── help/           # Página de ajuda
│   │   ├── app.component.* # Componente raiz da aplicação
│   │   └── app.routes.ts   # Configuração de rotas
│   ├── assets/             # Recursos estáticos (imagens, ícones)
│   ├── environments/       # Configurações de ambiente
│   └── main.ts            # Ponto de entrada da aplicação
├── android/               # Projeto Android (Capacitor)
├── capacitor.config.ts    # Configuração do Capacitor
├── ionic.config.json      # Configuração do Ionic
├── package.json           # Dependências e scripts
└── tsconfig.json         # Configuração do TypeScript
```

## 🔧 Funcionalidades Técnicas

- **Standalone Components**: Utiliza a nova arquitetura Angular com componentes independentes
- **Armazenamento Local**: Persistência de dados usando localStorage para histórico
- **Exportação CSV**: Geração de arquivos CSV com biblioteca PapaParse
- **Tema Dinâmico**: Sistema de temas com detecção automática de preferências
- **Responsividade**: Interface adaptável para diferentes tamanhos de tela
- **PWA Ready**: Configurado para funcionar como Progressive Web App
  terminar

## 🏗️ Arquitetura Visual do Sistema

### Estrutura Principal

```
                    ╔═══════════════════════════════════╗
                    ║           LIMA HUB                ║
                    ║      Sistema Científico           ║
                    ║          (PostgreSQL)             ║
                    ╚═══════════════════════════════════╝
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
   ╔═════════╗                ╔═════════╗                ╔═════════╗
   ║USUÁRIOS ║                ║PROJETOS ║                ║ANÁLISES ║
   ║         ║                ║         ║                ║         ║
   ║• Admin  ║◄──────────────►║• LIMA   ║◄──────────────►║• Dados  ║
   ║• Normal ║                ║• Outros ║                ║• Arquivos║
   ╚═════════╝                ╚═════════╝                ╚═════════╝
        │                           │                           │
        │                           │                           │
   ╔═════════╗                ╔═════════╗                ╔═════════╗
   ║PERMISS. ║                ║MÓDULOS  ║                ║RESULTS. ║
   ║         ║                ║         ║                ║         ║
   ║• Roles  ║                ║• Config ║                ║• Export ║
   ║• Guards ║                ║• Features║               ║• History║
   ╚═════════╝                ╚═════════╝                ╚═════════╝
```

---

## 👥 Sistema de Usuários

### Hierarquia de Acesso

```
┌─────────────────────────────────────────────────────────────────┐
│                      CONTROLE DE USUÁRIOS                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────┐         ┌─────────────────────┐       │
│  │    COORDENADOR      │         │   USUÁRIO NORMAL    │       │
│  │   (Administrador)   │         │    (Pesquisador)    │       │
│  │                     │         │                     │       │
│  │ ✅ Gerencia usuários │         │ ✅ Faz análises     │       │
│  │ ✅ Ativa/Desativa   │         │ ✅ Vê histórico     │       │
│  │ ✅ Configura sistema│         │ ✅ Exporta dados    │       │
│  │ ✅ Acesso total     │         │ ❌ Sem admin        │       │
│  │ ✅ Relatórios       │         │ ❌ Só seus dados    │       │
│  └─────────────────────┘         └─────────────────────┘       │
│           │                               │                     │
│           └───────────────┬───────────────┘                     │
│                           │                                     │
│                    ┌─────────────┐                             │
│                    │  AUDITORIA  │                             │
│                    │             │                             │
│                    │ • Quem fez  │                             │
│                    │ • Quando    │                             │
│                    │ • O que     │                             │
│                    └─────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
```

### Tabelas Principais

| Tabela            | Função                   | Dados Principais                 |
| ----------------- | ------------------------ | -------------------------------- |
| **users**         | Informações dos usuários | email, senha, nome, role, status |
| **roles**         | Definição de permissões  | coordenador, usuário normal      |
| **user_sessions** | Controle de acesso       | tokens, dispositivos, IPs        |

---

## 🔬 Sistema de Análises

### Fluxo Completo de Dados

```
┌─────────────────────────────────────────────────────────────────┐
│                    JORNADA DA ANÁLISE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1️⃣ ENTRADA          2️⃣ PROCESSAMENTO       3️⃣ SAÍDA          │
│                                                                 │
│  ┌─────────────┐     ┌─────────────┐      ┌─────────────┐     │
│  │   UPLOAD    │────►│ ALGORITMOS  │─────►│ RESULTADOS  │     │
│  │             │     │             │      │             │     │
│  │• Imagem     │     │• Medições   │      │• Dados      │     │
│  │• Metadados  │     │• Cálculos   │      │• Gráficos   │     │
│  │• Espécie    │     │• Validação  │      │• Relatórios │     │
│  │• Local      │     │• Conversões │      │• Exportação │     │
│  └─────────────┘     └─────────────┘      └─────────────┘     │
│         │                    │                    │            │
│         └────────────────────┼────────────────────┘            │
│                              │                                 │
│                    ┌─────────────┐                            │
│                    │ ARMAZENAMENTO│                            │
│                    │             │                            │
│                    │• Banco      │                            │
│                    │• Arquivos   │                            │
│                    │• Histórico  │                            │
│                    └─────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

### Dados Capturados

```
╔══════════════════════════════════════════════════════════════════╗
║                        METADADOS COMPLETOS                      ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  👤 QUEM                🕐 QUANDO              📊 O QUE          ║
║  ┌─────────────┐       ┌─────────────┐       ┌─────────────┐    ║
║  │• Usuário    │       │• Data       │       │• Medições   │    ║
║  │• Nome       │       │• Hora       │       │• Área       │    ║
║  │• Email      │       │• Timestamp  │       │• Perímetro  │    ║
║  │• Permissão  │       │• Sessão     │       │• Comprimento│    ║
║  └─────────────┘       └─────────────┘       └─────────────┘    ║
║                                                                  ║
║  🔬 EXPERIMENTO         📁 ARQUIVOS           📈 RESULTADOS      ║
║  ┌─────────────┐       ┌─────────────┐       ┌─────────────┐    ║
║  │• Espécie    │       │• Original   │       │• Estatísticas│   ║
║  │• Local      │       │• Processada │       │• Gráficos   │    ║
║  │• Amostra    │       │• CSV Export │       │• Comparações│    ║
║  │• Observações│       │• Relatórios │       │• Tendências │    ║
║  └─────────────┘       └─────────────┘       └─────────────┘    ║
╚══════════════════════════════════════════════════════════════════╝
```

### Tabelas de Análise

| Tabela               | Função                 | Dados Armazenados                          |
| -------------------- | ---------------------- | ------------------------------------------ |
| **analyses**         | Sessão de análise      | usuário, projeto, configurações, metadados |
| **analysis_results** | Resultados processados | medições, estatísticas, cálculos           |
| **analysis_files**   | Arquivos relacionados  | imagens, CSVs, relatórios                  |

---

## 🚀 Sistema Modular

### Arquitetura Extensível

```
┌─────────────────────────────────────────────────────────────────┐
│                      LIMA HUB - MODULAR                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                        PRESENTE                                 │
│                                                                 │
│              ┌─────────────────────────┐                       │
│              │      PROJETO LIMA       │                       │
│              │                         │                       │
│              │  🍃 Análise de Folhas   │                       │
│              │  📏 Morfometria         │                       │
│              │  📊 Estatísticas        │                       │
│              │  📁 Exportação          │                       │
│              └─────────────────────────┘                       │
│                           │                                     │
│                           ▼                                     │
│                                                                 │
│                        FUTURO                                   │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  PROJETO A  │  │  PROJETO B  │  │  PROJETO C  │            │
│  │             │  │             │  │             │            │
│  │🧬 Genética  │  │🌱 Ecologia  │  │🔬 Taxonomia │            │
│  │🔍 Sequências│  │🌍 Ambiente  │  │📋 Classific.│            │
│  │📈 Análises  │  │📊 Dados     │  │🏷️ Etiquetas │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Benefícios da Modularidade

- ✅ **Escalabilidade**: Novos projetos sem afetar existentes
- ✅ **Flexibilidade**: Configurações específicas por projeto
- ✅ **Manutenção**: Isolamento de funcionalidades
- ✅ **Reutilização**: Componentes compartilhados

---

## 📊 Exemplo Prático - Análise LIMA

### Cenário Real de Uso

```
┌─────────────────────────────────────────────────────────────────┐
│                    EXEMPLO: ANÁLISE DE FOLHA                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  👤 Usuário: Dr. João Silva                                     │
│  📅 Data: 15/01/2024 às 10:30                                  │
│  🔬 Projeto: LIMA - Análise Morfométrica                       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    DADOS DE ENTRADA                    │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ 🍃 Espécie: Eucalyptus grandis                         │   │
│  │ 🏷️ Amostra: EUC-001                                    │   │
│  │ 📷 Arquivo: eucalipto_001.jpg (2.1 MB)                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   PROCESSAMENTO                        │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ ⚙️ Algoritmo: Detecção de bordas + Cálculo de área     │   │
│  │ 🔧 Configuração: Medidas selecionadas                  │   │
│  │ ⏱️ Tempo: 2.3 segundos                                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                     RESULTADOS                         │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ 📏 Área: 15.420,5 pixels²                              │   │
│  │ 📐 Perímetro: 485,2 pixels                             │   │
│  │ 📊 Comprimento: 125,8 pixels                           │   │
│  │ 📊 Largura: 78,3 pixels                                │   │
│  │ 📈 Razão Aspecto: 1,61                                 │   │
│  │ 🔄 Circularidade: 0,82                                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   ARQUIVOS GERADOS                     │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ 📁 eucalipto_001_original.jpg                          │   │
│  │ 📁 eucalipto_001_processada.jpg                        │   │
│  │ 📊 eucalipto_001_resultados.csv                        │   │
│  │ 📋 eucalipto_001_relatorio.pdf                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Segurança e Auditoria

### Sistema de Rastreamento

```
┌─────────────────────────────────────────────────────────────────┐
│                      AUDITORIA COMPLETA                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🔍 RASTREAMENTO TOTAL                                          │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │    QUEM     │  │   QUANDO    │  │    O QUE    │            │
│  │             │  │             │  │             │            │
│  │👤 Usuário   │  │📅 Data      │  │⚡ Ação      │            │
│  │🌐 IP        │  │🕐 Hora      │  │📊 Dados     │            │
│  │💻 Device    │  │⏱️ Duração   │  │✅ Resultado │            │
│  │🔑 Sessão    │  │📍 Local     │  │❌ Erro      │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                 │
│  📋 LOGS REGISTRADOS:                                           │
│  • Login/Logout de usuários                                    │
│  • Criação/Edição de análises                                  │
│  • Upload/Download de arquivos                                 │
│  • Mudanças de configuração                                    │
│  • Tentativas de acesso negado                                 │
│  • Exportação de dados                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 🤝 Projeto UFJF

Este projeto é parte do Programa de insentivo à pesquisa científica da Universidade Federal de Juiz de Fora (UFJF).
