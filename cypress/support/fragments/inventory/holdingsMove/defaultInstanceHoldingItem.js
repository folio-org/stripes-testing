import uuid from 'uuid';
import getRandomPostfix from '../../../utils/stringTools';
import { ITEM_STATUS_NAMES } from '../../../constants';

export default {
  defaultUiInstanceType: {
    body: {
      code: `autotest_code_${getRandomPostfix()}`,
      id: uuid(),
      name: `autotest_name_${getRandomPostfix()}`,
      source: 'local',
    },
  },
  defaultUiHoldingsSources: {
    body: {
      id: uuid(),
      name: `autotest_title_${getRandomPostfix()}`,
      source: 'local',
    },
  },
  defaultUiInstance: {
    body: {
      childInstances: [],
      discoverySuppress: false,
      id: uuid(),
      instanceTypeId: uuid(),
      arentInstances: [],
      precedingTitles: [],
      previouslyHeld: false,
      source: `autotest_title_${getRandomPostfix()}`,
      staffSuppress: false,
      succeedingTitles: [],
      title: `autotest_title_${getRandomPostfix()}`,
    },
  },
  defaultUiHolding: {
    body: {
      id: uuid(),
      instanceId: uuid(),
      permanentLocationId: uuid(),
      sourceId: uuid(),
    },
  },
  defaultUiMaterialTypes: {
    body: {
      id: uuid(),
      name: `autotest_name_${getRandomPostfix()}`,
      source: 'local',
    },
  },
  defaultUiCreateItem: {
    body: {
      id: uuid(),
      barcode: `2134456_${getRandomPostfix()}`,
      holdingsRecordId: uuid(),
      materialType: {
        id: uuid(),
      },
      permanentLoanType: {
        id: uuid(),
      },
      status: {
        name: ITEM_STATUS_NAMES.AVAILABLE,
      },
    },
  },
};
