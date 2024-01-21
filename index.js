require("dotenv").config();

const authenticateVaultClient = async () => {
  const vaultClient = require("node-vault")({
    // NOTE: this only works with kv v1 engines
    apiVersion: "v1",
    endpoint: process.env.VAULT_ENDPOINT ,
    token: process.env.ROOT_TOKEN,
  });

  const mountPoint = process.env.MOUNT_POINT ?? "approle";
  const roleName = process.env.APP_ROLE_NAME ?? "my-app-role";
  const readPolicyName = "readonly-policy";
  const writePolicyName = "write-policy";

  try {
    const auths = await vaultClient.auths();

    // if no read policy with 'readPolicyName' exists, create one
    const policies = await vaultClient.getPolicy();
    if (!policies.keys.includes(readPolicyName))
      await vaultClient.addPolicy({
        name: readPolicyName,
        policy: '{ "path": { "secret/*": { "policy": "read" } } }',
      });

    // if no write policy with 'writePolicyName' exists, create one
    if (!policies.keys.includes(writePolicyName))
      await vaultClient.addPolicy({
        name: writePolicyName,
        policy: '{ "path": { "secret/*": { "policy": "write" } } }',
      });

    // enable approle auth method if not already enabled
    if (!auths.hasOwnProperty(`${mountPoint}/`)) {
      await vaultClient.enableAuth({
        mount_point: mountPoint,
        type: "approle",
        description: "Approle auth",
      });

      // if no app role with 'roleName' exists, create one
      await vaultClient.addApproleRole({
        role_name: roleName,
        policies: `${readPolicyName}, ${writePolicyName}`,
      });
    }

    // extract roleId and secretId for login
    const roleId = (await vaultClient.getApproleRoleId({ role_name: roleName })).data.role_id
    const secretId = (await vaultClient.getApproleRoleSecret({ role_name: roleName })).data.secret_id;

    // login and authenticate the vault client
    const login = await vaultClient.approleLogin({
      role_id: roleId,
      secret_id: secretId,
    });

    // set the token for the vault client
    vaultClient.token = login.auth.client_token;

    return vaultClient;
  } catch (error) {
    throw new Error(error.message);
  }
};

const run = async () => {
  try {
    const vaultClient = await authenticateVaultClient();

    // write a secret password to path 'secret/hello'
    await vaultClient.write("secret/hello", { password: "1234" });

    // read the secret password from path 'secret/hello'
    const { data } = await vaultClient.read("secret/hello");
    console.log(`secret password: ${data.password}`);
  } catch (error) {
    throw new Error(error.message);
  }
};

run();
