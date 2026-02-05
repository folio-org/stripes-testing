const { rpClient } = require('../client.js');
const { LATEST_LAUNCH_API } = require('../constants/api.js');

const getLatestLaunches = async ({ params } = {}) => {
  const { data } = await rpClient.get(LATEST_LAUNCH_API, { params });
  return { data };
};

const getLatestLaunch = async ({ name }) => {
  const params = {
    'filter.eq.name': name,
  };

  const { data } = await getLatestLaunches({ params });

  return data.content[0];
};

module.exports = {
  getLatestLaunches,
  getLatestLaunch,
};
