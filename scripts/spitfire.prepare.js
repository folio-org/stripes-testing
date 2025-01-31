/* eslint-disable no-console */
const axios = require('axios');
const cypressConfig = require('../cypress.config');
require('dotenv').config();

const envData = {
  apiBaseUrl: cypressConfig.env.OKAPI_HOST,
  tenant: cypressConfig.env.OKAPI_TENANT,
  username: cypressConfig.env.diku_login,
  password: cypressConfig.env.diku_password,
};

async function getToken() {
  axios.defaults.baseURL = envData.apiBaseUrl;
  axios.defaults.headers.common['x-okapi-tenant'] = envData.tenant;
  const response = await axios({
    method: 'post',
    url: '/authn/login-with-expiry',
    data: {
      username: envData.username,
      password: envData.password,
    },
  });
  const setCookieHeader = response.headers['set-cookie'];
  axios.defaults.headers.common.Cookie = setCookieHeader;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getEholdingsKbs() {
  const response = await axios({
    url: '/eholdings/kb-credentials',
  });
  return response.data.data;
}

async function unassignEholdingsKbUsers() {
  const existingKbs = await getEholdingsKbs();
  const usersResponse = await axios({
    url: `/eholdings/kb-credentials/${existingKbs[0].id}/users`,
  });
  const users = usersResponse.data.data;
  for (const user of users) {
    await axios({
      method: 'DELETE',
      url: `/eholdings/kb-credentials/${existingKbs[0].id}/users/${user.id}`,
    });
  }
}

async function resetEholdingsKbs() {
  const existingKbs = await getEholdingsKbs();
  if (
    existingKbs.length !== 1 ||
    existingKbs[0].attributes.url !== process.env.EHOLDINGS_KB_URL ||
    existingKbs[0].attributes.customerId !== process.env.EHOLDINGS_KB_ID ||
    existingKbs[0].attributes.apiKey !== process.env.EHOLDINGS_KB_KEY
  ) {
    for (const kb of existingKbs) {
      await axios({
        method: 'DELETE',
        url: `/eholdings/kb-credentials/${kb.id}`,
      });
    }
    console.log('Configuring eHoldings KB');
    await axios({
      method: 'POST',
      url: '/eholdings/kb-credentials',
      headers: { 'Content-type': 'application/vnd.api+json' },
      data: {
        data: {
          type: 'kbCredentials',
          attributes: {
            url: process.env.EHOLDINGS_KB_URL,
            customerId: process.env.EHOLDINGS_KB_ID,
            name: 'Knowledge base Auto',
            apiKey: process.env.EHOLDINGS_KB_KEY,
          },
        },
      },
    });
    await unassignEholdingsKbUsers();
  }
}

async function getFieldProtectionSettings() {
  const response = await axios({
    url: '/field-protection-settings/marc?limit=2000',
  });
  return response.data.marcFieldProtectionSettings;
}

async function resetFieldProtectionSettings() {
  const existingSettings = await getFieldProtectionSettings();
  const userSettings = existingSettings.filter((setting) => setting.source === 'USER');
  console.log('Removing user field protection settings');
  for (const setting of userSettings) {
    await axios({
      method: 'DELETE',
      url: `/field-protection-settings/marc/${setting.id}`,
    });
  }
}

async function deleteItemsForHoldings(holdingsId) {
  const itemsResponse = await axios({
    url: `inventory/items-by-holdings-id?query=holdingsRecordId==${holdingsId}`,
  });
  const deletePromises = [];
  // eslint-disable-next-line guard-for-in
  for (const item of itemsResponse.data.items) {
    deletePromises.push(
      axios({
        method: 'DELETE',
        url: `inventory/items/${item.id}`,
      }),
    );
  }
  const settledDeletePromises = await Promise.allSettled(deletePromises);
  settledDeletePromises.forEach((settledPromise) => {
    if (settledPromise.status === 'rejected') console.log(JSON.stringify(settledPromise.reason));
  });
}

async function deleteHoldingsForInstance(instanceId) {
  const holdingsResponse = await axios({
    url: `holdings-storage/holdings?limit=200&query=instanceId="${instanceId}"`,
  });
  const deletePromises = [];
  // eslint-disable-next-line guard-for-in
  for (const holdings of holdingsResponse.data.holdingsRecords) {
    await deleteItemsForHoldings(holdings.id);
    deletePromises.push(
      await axios({
        method: 'DELETE',
        url: `holdings-storage/holdings/${holdings.id}`,
      }),
    );
  }
  const settledDeletePromises = await Promise.allSettled(deletePromises);
  settledDeletePromises.forEach((settledPromise) => {
    if (settledPromise.status === 'rejected') console.log(JSON.stringify(settledPromise.reason));
  });
}

async function removeAutotestInstances() {
  const batchSize = 15;
  const autotestInstances = await axios({
    url: '/search/instances?limit=500&query=(title all "autotest")',
  });
  console.log('Removing autotest instances');
  const deletePromises = [];
  const deletePromisesBatches = [];
  for (const instance of autotestInstances.data.instances) {
    await deleteHoldingsForInstance(instance.id);
    deletePromises.push(
      axios({
        method: 'DELETE',
        url: `/instance-storage/instances/${instance.id}`,
        validateStatus: () => true,
      }),
    );
  }
  for (let i = 0; i < deletePromises.length; i += batchSize) {
    const batch = [];
    for (let j = i; j < i + batchSize && j < deletePromises.length; j++) {
      batch.push(deletePromises[j]);
    }
    deletePromisesBatches.push(batch);
  }
  for (const [index, promisesBatch] of deletePromisesBatches.entries()) {
    if (!(index % 6)) await getToken();
    await Promise.allSettled(promisesBatch);
    await wait(1500);
  }
  await getToken();
}

async function removeAutotestAuthorities() {
  const autotestAuthorities = await axios({
    url: '/search/authorities?limit=500&query=(keyword="autotest" or keyword="auto")',
  });
  console.log('Removing autotest authorities');
  let counter = 1;
  for (const authority of autotestAuthorities.data.authorities) {
    if (!(counter % 100)) await getToken();
    if (!(counter % 15)) await wait(1500);
    await axios({
      method: 'DELETE',
      url: `/authority-storage/authorities/${authority.id}`,
      validateStatus: () => true,
    });
    counter++;
  }
  await getToken();
}

async function removeUserAuthoritySourceFiles() {
  const response = await axios({
    url: '/authority-source-files?limit=200',
  });
  const userSourceFiles = response.data.authoritySourceFiles.filter(
    (sourceFile) => sourceFile.source === 'local',
  );
  console.log('Removing user authority source files');
  let counter = 1;
  for (const sourceFile of userSourceFiles) {
    if (!(counter % 15)) await wait(1500);
    await axios({
      method: 'DELETE',
      url: `/authority-source-files/${sourceFile.id}`,
      validateStatus: () => true,
    });
    counter++;
  }
}

async function pingDataImportJobExecutionsEndpoint() {
  try {
    console.log('Pinging data import jobExecutions endpoint');
    await axios({
      url: '/metadata-provider/jobExecutions?limit=10000&sortBy=started_date,desc&subordinationTypeNotAny=COMPOSITE_CHILD&subordinationTypeNotAny=PARENT_SINGLE',
    });
  } catch (error) {
    if (error.response) {
      throw Error('jobExecutions reponse status: ' + error.response.status);
    } else throw Error('No response from jobExecutions endpoint');
  }
}

(async () => {
  await getToken();
  await pingDataImportJobExecutionsEndpoint();
  await resetEholdingsKbs();
  await resetFieldProtectionSettings();
  await removeAutotestInstances();
  await removeAutotestAuthorities();
  await removeUserAuthoritySourceFiles();
})();
