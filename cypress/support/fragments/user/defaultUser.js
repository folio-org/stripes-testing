import uuid from 'uuid';
import getRandomPostfix from '../../utils/stringTools';
import defaultInstanceHoldingItem from '../inventory/holdingsMove/defaultInstanceHoldingItem';
import NewInctanceHoldingsItem from '../inventory/newInctanceHoldingsItem';
import NewServicePoint from '../service_point/newServicePoint';

export default {
  // defaultUiPatronGroup : {
  //   body: {
  //     desc: `autotest_name_${getRandomPostfix()}`,
  //     group: `autotest_group_${getRandomPostfix()}`,
  //     id: uuid(),
  //   }
  // },
  defaultUiPatron : {
    body: {
      active: true,
      barcode: `1234456_${getRandomPostfix()}`,
      departments: [],
      id: uuid(),
      patronGroup: uuid(),
      personal: {
        email: 'drshalina20gmail.com',
        firstName: '',
        lastName: `autotest_login_${getRandomPostfix()}`,
        preferredContactTypeId: '002',
      },
      username: `autotest_name_${getRandomPostfix()}`,
    }
  },
  defaultUiRequestPrefStorage : {
    body: {
      defaultDeliveryAddressTypeId: null,
      defaultServicePointId: null,
      delivery: false,
      fulfillment: 'Hold Shelf',
      holdShelf: true,
      id: uuid(),
      userId: uuid(),
    },
  },
  defaultUiPermissions : {
    body: {
      permissions: [],
      id: uuid(),
      userId: uuid(),
    }
  },
  defaultUiChekhOutItem : {
    body: {
      id: uuid(),
      itemBarcode: defaultInstanceHoldingItem.defaultUiCreateItem.body.barcode,
      loanDate: '2022-12-28T12:38:14.858Z',
      servicePointId: NewServicePoint.defaultUiServicePoint.body.id,
      userBarcode: `1234456_${getRandomPostfix()}`,
    }
  },
  defaultUiCreateNewPassword : {
    body: {
      id: uuid(),
      password: 'password',
      userId: uuid(),
      username: `autotest_login_${getRandomPostfix()}`,
    }
  },
};

