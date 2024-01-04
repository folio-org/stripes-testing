import uuid from 'uuid';
import NewOrganization from '../organizations/newOrganization';

const getDefaultOrder = ({ vendorId, poNumber, manualPo, orderType = 'One-Time' } = {}) => {
  const defaultOrder = {
    id: uuid(),
    vendor: vendorId,
    poNumber,
    manualPo,
    orderType,
  };
  if (!vendorId) {
    NewOrganization.createViaApi(NewOrganization.getDefaultOrganization()).then(
      (newOrganization) => {
        defaultOrder.vendor = newOrganization.id;
      },
    );
  }
  return defaultOrder;
};

const getDefaultOngoingOrder = ({ vendorId = '' }) => ({
  id: uuid(),
  vendor: vendorId,
  ongoing: {
    isSubscription: false,
    manualRenewal: false,
  },
  orderType: 'Ongoing',
});

const defaultOneTimeOrder = {
  id: uuid(),
  vendor: '',
  orderType: 'One-Time',
};
const defaultOneTimeOrderAPI = {
  id: uuid(),
  vendor: '',
  orderType: 'One-time',
};
const defaultOngoingTimeOrder = {
  id: uuid(),
  vendor: '',
  ongoing: {
    isSubscription: false,
    manualRenewal: false,
  },
  orderType: 'Ongoing',
};

export default {
  getDefaultOrder,
  defaultOneTimeOrderAPI,
  getDefaultOngoingOrder,
  defaultOneTimeOrder,
  defaultOngoingTimeOrder,
  createViaApi(order = defaultOneTimeOrder) {
    return cy.okapiRequest({
      method: 'POST',
      path: 'orders/composite-orders',
      body: order,
      isDefaultSearchParamsRequired: false,
    });
  },
};
