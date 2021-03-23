import uuid from 'uuid';

import okapiKy from './okapiKy';

const DEFAULT_INSTANCE = {
  source: 'FOLIO',
  discoverySuppress: false,
  staffSuppress: false,
  previouslyHeld: false,
};

export const createInstance = async ({ instance, holdings = [], items = [] }) => {
  const ky = await okapiKy();
  const instanceId = uuid();

  await ky.post('inventory/instances', {
    json: {
      ...DEFAULT_INSTANCE,
      id: instanceId,
      ...instance,
    },
  });

  const holdingIds = await Promise.all(
    holdings.map(holding => createHolding({ ...holding, instanceId })),
  );

  const itemsPromises = holdingIds.reduce((acc, holdingsRecordId, idx) => {
    return [
      ...acc,
      ...items[idx].map(item => createItem({ ...item, holdingsRecordId })),
    ];
  }, []);
  const itemIds = await Promise.all(itemsPromises);

  return { instanceId, holdingIds, itemIds };
};

export const createHolding = async (holding) => {
  const ky = await okapiKy();
  const holdingId = uuid();

  await ky.post('holdings-storage/holdings', {
    json: {
      id: holdingId,
      ...holding,
    },
  });

  return holdingId;
};

export const createItem = async (item) => {
  const ky = await okapiKy();
  const itemId = uuid();

  await ky.post('inventory/items', {
    json: {
      id: itemId,
      ...item,
    },
  });

  return itemId;
};


export const getInstanceTypes = async (options) => {
  const ky = await okapiKy();
  const response = await ky.get('instance-types', {
    searchParams: {
      query: 'cql.allRecords=1',
      limit: 1000,
      ...options,
    },
  });
  const data = await response.json();

  return data.instanceTypes;
};

export const getHoldingSources = async (options) => {
  const ky = await okapiKy();
  const response = await ky.get('holdings-sources', {
    searchParams: {
      query: 'cql.allRecords=1',
      limit: 1000,
      ...options,
    },
  });
  const data = await response.json();

  return data.holdingsRecordsSources;
};

export const getHoldingTypes = async (options) => {
  const ky = await okapiKy();
  const response = await ky.get('holdings-types', {
    searchParams: {
      query: 'cql.allRecords=1',
      limit: 1000,
      ...options,
    },
  });
  const data = await response.json();

  return data.holdingsTypes;
};

export const getLocations = async (options) => {
  const ky = await okapiKy();
  const response = await ky.get('locations', {
    searchParams: {
      query: 'cql.allRecords=1',
      limit: 1000,
      ...options,
    },
  });
  const data = await response.json();

  return data.locations;
};

export const getMaterialTypes = async (options) => {
  const ky = await okapiKy();
  const response = await ky.get('material-types', {
    searchParams: {
      query: 'cql.allRecords=1',
      limit: 1000,
      ...options,
    },
  });
  const data = await response.json();

  return data.mtypes;
};

export const getLoanTypes = async (options) => {
  const ky = await okapiKy();
  const response = await ky.get('loan-types', {
    searchParams: {
      query: 'cql.allRecords=1',
      limit: 1000,
      ...options,
    },
  });
  const data = await response.json();

  return data.loantypes;
};
