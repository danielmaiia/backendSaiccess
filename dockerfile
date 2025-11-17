# 1. Começamos com uma imagem oficial do Node.js
FROM node:18-slim

# 2. Instalamos as dependências do sistema que o Oracle precisa
RUN apt-get update && apt-get install -y wget unzip libaio1 && rm -rf /var/lib/apt/lists/*

# 3. Definimos variáveis para a versão do Instant Client
ENV ORACLE_CLIENT_VERSION 21.13.0.0.0
ENV ORACLE_CLIENT_DIR /opt/oracle/instantclient_21_13

# 4. Baixamos, descompactamos e configuramos o Oracle Instant Client
RUN mkdir -p /opt/oracle \
    && cd /opt/oracle \
    && wget https://download.oracle.com/otn_software/linux/instantclient/2113000/instantclient-basic-linux.x64-${ORACLE_CLIENT_VERSION}dbru.zip \
    && wget https://download.oracle.com/otn_software/linux/instantclient/2113000/instantclient-sdk-linux.x64-${ORACLE_CLIENT_VERSION}dbru.zip \
    && unzip instantclient-basic-linux.x64-${ORACLE_CLIENT_VERSION}dbru.zip \
    && unzip instantclient-sdk-linux.x64-${ORACLE_CLIENT_VERSION}dbru.zip \
    && rm *.zip

# 5. Dizemos ao sistema onde encontrar as bibliotecas do Oracle
ENV LD_LIBRARY_PATH $ORACLE_CLIENT_DIR

# 6. Preparamos a pasta da nossa aplicação
WORKDIR /usr/src/app

# 7. Copiamos o package.json e instalamos as dependências (incluindo o oracledb)
COPY package*.json ./
RUN npm install

# 8. Copiamos o resto do seu código (app.js, server.js, etc.)
COPY . .

# 9. Expondo a porta que seu server.js usa
EXPOSE 9000

# 10. O comando para iniciar seu servidor
CMD [ "node", "server.js" ]