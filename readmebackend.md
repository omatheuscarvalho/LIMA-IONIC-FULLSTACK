## 🖥️ Backend API

O LIMA possui um backend robusto desenvolvido em Node.js com TypeScript que fornece uma API REST completa para gerenciamento de usuários, autenticação, atividades e notificações.

### 🛠️ Tecnologias do Backend

- **[Node.js](https://nodejs.org/)** v18+ - Runtime JavaScript
- **[TypeScript](https://www.typescriptlang.org/)** - Tipagem estática
- **[Express.js](https://expressjs.com/)** - Framework web
- **[Prisma](https://www.prisma.io/)** - ORM moderno para banco de dados
- **[PostgreSQL](https://www.postgresql.org/)** - Banco de dados relacional
- **[JWT](https://jwt.io/)** - Autenticação baseada em tokens
- **[bcrypt](https://github.com/kelektiv/node.bcrypt.js)** - Hash de senhas
- **[Winston](https://github.com/winstonjs/winston)** - Sistema de logs
- **[Helmet](https://helmetjs.github.io/)** - Segurança HTTP
- **[CORS](https://github.com/expressjs/cors)** - Cross-Origin Resource Sharing
- **[Rate Limiting](https://github.com/nfriedly/express-rate-limit)** - Limitação de requisições

### 🏗️ Arquitetura do Backend

```
backend/
├── src/
│   ├── middleware/         # Middlewares de autenticação e autorização
│   │   └── auth.ts        # Middleware de autenticação JWT
│   ├── routes/            # Rotas da API
│   │   ├── auth.ts        # Autenticação e registro
│   │   ├── users.ts       # Gerenciamento de usuários
│   │   ├── activities.ts  # Log de atividades
│   │   ├── notifications.ts # Sistema de notificações
│   │   └── admin.ts       # Rotas administrativas
│   ├── utils/             # Utilitários e helpers
│   │   ├── logger.ts      # Sistema de logs
│   │   ├── security.ts    # Funções de segurança
│   │   └── database.ts    # Operações de banco de dados
│   └── server.ts          # Configuração principal do servidor
├── prisma/
│   └── schema.prisma      # Schema do banco de dados
├── tests/                 # Testes automatizados
├── .env.example          # Exemplo de variáveis de ambiente
└── package.json          # Dependências e scripts
```

### 🔐 Funcionalidades do Backend

#### Autenticação e Autorização

- **Registro de usuários** com validação de dados
- **Login seguro** com JWT tokens
- **Refresh tokens** para renovação automática
- **Controle de sessões** com expiração configurável
- **Níveis de acesso**: USER, ADMIN, SUPER_ADMIN
- **Middleware de autorização** para proteção de rotas

#### Gerenciamento de Usuários

- **CRUD completo** de usuários
- **Perfis de usuário** com avatar e informações pessoais
- **Ativação/desativação** de contas
- **Alteração de senhas** com validação segura
- **Exportação de dados** do usuário

#### Sistema de Atividades

- **Log automático** de todas as ações do usuário
- **Rastreamento de eventos**: login, logout, alterações de perfil
- **Metadados detalhados**: IP, user-agent, timestamps
- **Limpeza automática** de logs antigos
- **Relatórios de atividade** para administradores

#### Sistema de Notificações

- **Notificações em tempo real** para usuários
- **Tipos de notificação**: INFO, WARNING, ERROR, SUCCESS, SYSTEM
- **Notificações direcionadas** ou broadcast
- **Controle de leitura** e histórico
- **Limpeza automática** de notificações antigas

#### Recursos de Segurança

- **Rate limiting** para prevenção de ataques
- **Validação rigorosa** de entrada de dados
- **Sanitização** contra XSS e SQL injection
- **Headers de segurança** com Helmet
- **Criptografia** de dados sensíveis
- **Logs de segurança** detalhados

#### Administração

- **Dashboard administrativo** com estatísticas
- **Gerenciamento de usuários** em massa
- **Configurações do sistema** dinâmicas
- **Backup e limpeza** automática de dados
- **Monitoramento de saúde** do sistema

### 🚀 Configuração do Backend

```bash
# Navegue para o diretório do backend
cd backend

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env com suas configurações

# Configure o banco de dados
npx prisma generate
npx prisma db push

# Inicie o servidor de desenvolvimento
npm run dev

# Para produção
npm run build
npm start
```

### 📡 Endpoints da API

#### Autenticação

- `POST /api/auth/register` - Registro de usuário
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Renovar token
- `POST /api/auth/logout` - Logout

#### Usuários

- `GET /api/users/profile` - Perfil do usuário
- `PUT /api/users/profile` - Atualizar perfil
- `PUT /api/users/password` - Alterar senha
- `DELETE /api/users/account` - Deletar conta

#### Atividades

- `GET /api/activities` - Listar atividades do usuário
- `GET /api/activities/stats` - Estatísticas de atividades
- `DELETE /api/activities/old` - Limpar atividades antigas

#### Notificações

- `GET /api/notifications` - Listar notificações
- `PUT /api/notifications/:id/read` - Marcar como lida
- `DELETE /api/notifications/:id` - Deletar notificação

#### Administração (Admin apenas)

- `GET /api/admin/users` - Listar todos os usuários
- `GET /api/admin/stats` - Estatísticas do sistema
- `POST /api/notifications/admin/send` - Enviar notificação

### 🔧 Variáveis de Ambiente

O backend utiliza as seguintes variáveis de ambiente principais:

```env
# Banco de Dados
DATABASE_URL="postgresql://user:password@localhost:5432/lima_db"

# Servidor
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET="your-secret-key"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Segurança
ENCRYPTION_KEY="your-encryption-key"
BCRYPT_ROUNDS=12

# Admin Padrão
DEFAULT_ADMIN_EMAIL="admin@lima.com"
DEFAULT_ADMIN_PASSWORD="admin123456"
```

### 📊 Monitoramento e Logs

O backend inclui um sistema completo de monitoramento:

- **Logs estruturados** com Winston
- **Health check** endpoint (`/health`)
- **Métricas de performance** e uso
- **Alertas automáticos** para erros críticos
- **Rotação automática** de arquivos de log

### 🧪 Testes

```bash
# Executar todos os testes
npm test

# Testes com coverage
npm run test:coverage

# Testes em modo watch
npm run test:watch
```

O backend está totalmente preparado para produção com todas as melhores práticas de segurança, performance e manutenibilidade implementadas.
