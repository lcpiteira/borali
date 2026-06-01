# 🔥 Setup Firebase para BoraAli — Passo a Passo

## Passo 1: Criar o Projeto Firebase

1. Abre: https://console.firebase.google.com/
2. Clica **"Adicionar projeto"** (ou "Create a project")
3. Nome do projeto: `BoraAli`
4. Desativa o Google Analytics (não precisamos, é gratuito sem ele)
5. Clica **"Criar projeto"**
6. Espera criar → clica **"Continuar"**

---

## Passo 2: Registar a Web App

1. Na página inicial do projeto, clica no ícone **Web** (`</>`)
2. Nome da app: `BoraAli`
3. **NÃO** atives o Firebase Hosting (vamos usar GitHub Pages)
4. Clica **"Registar app"**
5. Vai aparecer o bloco de configuração:

```javascript
const firebaseConfig = {
    apiKey: "AIzaSy...",
    authDomain: "boraali-XXXXX.firebaseapp.com",
    databaseURL: "https://boraali-XXXXX-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "boraali-XXXXX",
    storageBucket: "boraali-XXXXX.firebasestorage.app",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};
```

6. **COPIA estes valores** — vais precisar para o `app.js`
7. Clica **"Continuar para a consola"**

---

## Passo 3: Ativar Authentication (Google Login)

1. No menu lateral esquerdo → **Build** → **Authentication**
2. Clica **"Começar"** (ou "Get started")
3. Vai ao separador **"Sign-in method"**
4. Clica em **Google**
5. Ativa o toggle **"Ativar"**
6. Escolhe o teu email como "Project support email"
7. Clica **"Guardar"**

### Adicionar domínios autorizados (depois do deploy):
1. Ainda em Authentication → separador **"Settings"**
2. Secção **"Authorized domains"**
3. Adiciona: `teu-username.github.io`

---

## Passo 4: Criar a Realtime Database

1. Menu lateral → **Build** → **Realtime Database**
2. Clica **"Criar base de dados"** (ou "Create Database")
3. Localização: **europe-west1** (Bélgica) — gratuito e perto de Portugal
4. Regras de segurança: escolhe **"Iniciar em modo de teste"** (vamos alterar já a seguir)
5. Clica **"Ativar"**

---

## Passo 5: Definir Regras de Segurança

1. Na Realtime Database → separador **"Regras"** (ou "Rules")
2. Apaga tudo e cola:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    "groups": {
      "$groupId": {
        ".read": "data.child('members').child(auth.uid).exists()",
        ".write": "data.child('members').child(auth.uid).exists() || !data.exists()"
      }
    },
    "codes": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

3. Clica **"Publicar"**

### O que estas regras fazem:
- **users**: cada user só lê/escreve os seus dados
- **groups**: só membros do grupo podem ler/escrever; qualquer autenticado pode criar um grupo novo
- **codes**: qualquer utilizador autenticado pode ler/escrever códigos de convite

---

## Passo 6: Colar a Config no app.js

1. Abre o ficheiro `app.js`
2. Substitui o bloco `FIREBASE_CONFIG` (linhas 5-13) com os valores que copiaste no Passo 2

---

## Passo 7: Deploy no GitHub Pages

1. Cria um repositório no GitHub (ex: `BoraAli`)
2. Push dos ficheiros:
```bash
cd BoraAli
git init
git add .
git commit -m "Initial commit - BoraAli shopping list app"
git remote add origin https://github.com/TEU-USERNAME/BoraAli.git
git push -u origin main
```
3. No GitHub → **Settings** → **Pages**
4. Source: **Deploy from a branch**
5. Branch: `main` / `/ (root)`
6. Clica **Save**
7. Espera 1-2 minutos → o URL será: `https://teu-username.github.io/BoraAli/`

---

## Passo 8: Autorizar o Domínio do GitHub Pages

1. Volta ao Firebase Console → **Authentication** → **Settings**
2. Em **"Authorized domains"** clica **"Add domain"**
3. Adiciona: `teu-username.github.io`
4. Guarda

---

## ✅ Pronto!

A app está live. Abre o URL do GitHub Pages, faz login com Google, cria um grupo e partilha o código com quem vai de férias contigo! 🏖️

---

## 💰 Custos: ZERO

Plano Spark (gratuito) do Firebase inclui:
| Serviço | Limite Gratuito |
|---------|----------------|
| Authentication | Ilimitado |
| Realtime Database | 1 GB armazenamento |
| Transferência | 10 GB/mês |
| Conexões simultâneas | 100 |

Para uma lista de compras entre amigos, nunca vais atingir estes limites.
