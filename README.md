# BoraAli 🛒

Lista de compras cooperativa para férias — organiza as compras em grupo!

## Funcionalidades

- 🔐 **Login com Google** (OAuth)
- 👥 **Grupos** — Cria um grupo e partilha o código com amigos
- 📝 **Lista de compras** — Adiciona artigos com quantidade e unidade
- ✅ **Marcar como comprado** — Todos veem em tempo real
- 👑 **Admin do grupo** — Pode eliminar o grupo e gerir membros
- 📱 **PWA** — Funciona como app no telemóvel

## Setup

### 1. Criar projeto Firebase

1. Vai a [Firebase Console](https://console.firebase.google.com/)
2. Cria um novo projeto chamado "BoraAli" (ou o nome que quiseres)
3. Ativa **Authentication** → Sign-in method → **Google** (ativa-o)
4. Cria uma **Realtime Database** (não Firestore) na região europe-west1
5. Nas regras da Realtime Database, usa:

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

### 2. Configurar a app

1. No Firebase Console → Project Settings → Web app → copia a config
2. Edita `app.js` e substitui o `FIREBASE_CONFIG` com os teus valores

### 3. Deploy no GitHub Pages

1. Cria um repositório no GitHub
2. Push dos ficheiros
3. Settings → Pages → Source: "main" branch, pasta "/ (root)"
4. No Firebase Console → Authentication → Authorized domains → adiciona o domínio do GitHub Pages (ex: `teu-user.github.io`)

## Estrutura da Base de Dados

```
├── users/
│   └── {uid}/
│       ├── name
│       ├── email
│       ├── photoURL
│       └── groups/
│           └── {groupId}: true
├── groups/
│   └── {groupId}/
│       ├── name
│       ├── code (6 chars)
│       ├── master (uid do criador)
│       ├── createdAt
│       ├── members/
│       │   └── {uid}/
│       │       ├── name
│       │       ├── email
│       │       ├── photoURL
│       │       └── joinedAt
│       └── items/
│           └── {itemId}/
│               ├── name
│               ├── quantity
│               ├── unit
│               ├── addedBy (uid)
│               ├── addedByName
│               ├── addedAt
│               ├── checked
│               ├── checkedBy
│               ├── checkedByName
│               └── checkedAt
└── codes/
    └── {CODE}: {groupId}
```

## Tecnologias

- HTML/CSS/JS vanilla (sem frameworks)
- Firebase Authentication (Google OAuth)
- Firebase Realtime Database
- GitHub Pages (hosting gratuito)

## Plano Gratuito Firebase (Spark)

- Auth: ilimitado
- Realtime Database: 1 GB armazenamento, 10 GB/mês transferência
- Mais que suficiente para listas de compras entre amigos!
