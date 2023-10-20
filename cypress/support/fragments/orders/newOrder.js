import uuid from 'uuid';
import NewOrganization from '../organizations/newOrganization';

const getDefaultOrder = ({ vendorId, poNumber, orderType = 'One-Time' } = {}) => {
  const defaultOrder = {
    id: uuid(),
    poNumber,
    vendor: vendorId,
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
