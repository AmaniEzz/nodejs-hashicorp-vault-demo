require("dotenv").config();

const authenticateVaultClient = async () => {
  // TODO: read variables and token from config file or .env file
  const vaultClient = require("node-vault")({
    apiVersion: "v1",
    endpoint: "http://localhost:8200",
    token: process.env.ROOT_TOKEN,
  });

  const mountPoint = "approle";
  const roleName = "my-app-role";
  const readPolicyName = "readonly-policy";
  const writePolicyName = "write-policy";

  try {
    const auths = await vaultClient.auths();

    // if no policy with 'readPolicyName' exists, create one
    const policies = await vaultClient.getPolicy();
    if (!policies.keys.includes(readPolicyName))
      await vaultClient.addPolicy({
        name: readPolicyName,
        policy: '{ "path": { "secret/*": { "policy": "read" } } }',
      });

    // add a write policy
    // if no policy with 'writePolicyName' exists, create one
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

      // if not approle with 'roleName' exists, create one
      await vaultClient.addApproleRole({
        role_name: roleName,
        policies: `${readPolicyName}, ${writePolicyName}`,
      });
    }

    const roleId = (await vaultClient.getApproleRoleId({ role_name: roleName }))
      .data.role_id;
    const secretId = (
      await vaultClient.getApproleRoleSecret({ role_name: roleName })
    ).data.secret_id;

    const login = await vaultClient.approleLogin({
      role_id: roleId,
      secret_id: secretId,
    });

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
