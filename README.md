# vault-demo

## 1) Login local vault server

```bash
docker-compose up
```

Head over to [http://localhost:8200](http://localhost:8200) and you’ll see the login screen below on the Vault web UI.
Copy the root_token from the cli to login.

---

## 2) Set ROOT_TOKEN env variable

Open `.env` file and add your root token

```
ROOT_TOKEN=<YOU_ROOT_TOKEN>
```

---

## 3) Run The Demo

run `npm run start`
