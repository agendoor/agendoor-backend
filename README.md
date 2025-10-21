# agendoor-backend

Este é o repositório do back-end do projeto Agendoor, desenvolvido com Node.js, Express e Prisma.

## Configuração Local

Para configurar e rodar o projeto localmente, siga os passos abaixo:

1.  **Clone o repositório:**
    ```bash
    git clone <URL_DO_REPOSITORIO>
    cd agendoor-backend
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    ```

3.  **Crie o arquivo de variáveis de ambiente:**
    Crie um arquivo `.env` na raiz do projeto, baseado no `.env.example`:
    ```
    cp .env.example .env
    ```
    Edite o arquivo `.env` e configure as variáveis de ambiente necessárias, como a URL do banco de dados e as credenciais do Twilio.
    ```
    DATABASE_URL="postgresql://user:password@host:port/database?schema=public"
    TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    TWILIO_AUTH_TOKEN=your_auth_token
    TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
    JWT_SECRET=your_super_secret_jwt_key
    ```

4.  **Execute as migrações do banco de dados:**
    ```bash
    npx prisma migrate dev
    ```

5.  **Inicie o servidor:**
    ```bash
    npm run dev
    ```
    O servidor estará disponível em `http://localhost:3000`.

## Deploy no Railway

Para fazer o deploy do `agendoor-backend` no Railway, siga estas instruções:

1.  **Pré-requisitos:**
    *   Uma conta no Railway.
    *   Railway CLI instalado.

2.  **Crie um novo projeto no Railway:**
    Você pode criar um projeto a partir de um repositório do GitHub.

3.  **Adicione um banco de dados PostgreSQL:**
    No painel do seu projeto no Railway, adicione um novo serviço e escolha "PostgreSQL".

4.  **Configure as variáveis de ambiente:**
    No painel do seu projeto, vá para as variáveis e adicione as mesmas variáveis do seu arquivo `.env`. O Railway injetará automaticamente a `DATABASE_URL` se você conectou o serviço do banco de dados.

5.  **Ajuste o comando de build e start:**
    O Railway provavelmente detectará que é um projeto Node.js e usará os scripts `build` e `start` do seu `package.json`.
    *   **Build command:** `npm run build`
    *   **Start command:** `npm start`

    Certifique-se de que o seu `package.json` tem os scripts `build` (para compilar o TypeScript) e `start` (para iniciar o servidor a partir do diretório `dist`).

