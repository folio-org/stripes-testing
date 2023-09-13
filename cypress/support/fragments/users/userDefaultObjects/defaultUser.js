import uuid from 'uuid';
import getRandomPostfix from '../../../utils/stringTools';
import defaultInstanceHoldingItem from '../../inventory/holdingsMove/defaultInstanceHoldingItem';
import NewServicePoint from '../../settings/tenant/servicePoints/newServicePoint';
import { FULFILMENT_PREFERENCES } from '../../../constants';

const defaultApiPatron = {
  username: `autotest_username_${getRandomPostfix()}`,
  active: true,
  barcode: `1234456_${getRandomPostfix()}`,
  personal: {
    email: 'test@folio.org',
    firstName: `autotest_user_firstname_${getRandomPostfix()}`,
    middleName: `autotest_user_middlename_${getRandomPostfix()}`,
    lastName: `autotest_user_lastname_${getRandomPostfix()}`,
    preferredContactTypeId: '002',
  },
  departments: [],
};

const defaultUiPatron = {
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
    username: `autotest_username_${getRandomPostfix()}`,
  },
};

export default {
  defaultApiPatron,
  defaultUiPatron,
  defaultUiRequestPrefStorage: {
    body: {
      defaultDeliveryAddressTypeId: null,
      defaultServicePointId: null,
      delivery: false,
      fulfillment: FULFILMENT_PREFERENCES.HOLD_SHELF,
      holdShelf: true,
      id: uuid(),
      userId: uuid(),
    },
  },
  defaultUiPermissions: {
    body: {
      permissions: [],
      id: uuid(),
      userId: uuid(),
    },
  },
  defaultUiChekhOutItem: {
    body: {
      id: uuid(),
      itemBarcode: defaultInstanceHoldingItem.defaultUiCreateItem.body.barcode,
      loanDate: '2022-12-28T12:38:14.858Z',
      servicePointId: NewServicePoint.defaultUiServicePoint.body.id,
      userBarcode: defaultUiPatron.body.barcode,
    },
  },
  defaultUiCreateNewPassword: {
    body: {
      id: uuid(),
      password: 'password',
      userId: uuid(),
      username: `autotest_login_${getRandomPostfix()}`,
    },
  },
};
