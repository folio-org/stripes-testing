import okapiKy from './okapiKy';

export const getUsers = async (options) => {
  const ky = await okapiKy();
  const response = await ky.get('users', {
    searchParams: {
      query: 'cql.allRecords=1',
      limit: 1000,
      ...options,
    },
  });
  const data = await response.json();

  return data.users;
};

export const getUserServicePoints = async (userId) => {
  const ky = await okapiKy();
  const response = await ky.get('service-points-users', {
    searchParams: {
      query: `(userId==${userId})`,
      limit: 1000,
    },
  });
  const data = await response.json();

  return data.servicePointsUsers;
};
