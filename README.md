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

## 🤝 Projeto UFJF

Este projeto é parte do Programa de insentivo à pesquisa científica da Universidade Federal de Juiz de Fora (UFJF).
