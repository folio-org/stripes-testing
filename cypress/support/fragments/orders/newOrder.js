import uuid from 'uuid';
import NewOrganization from '../organizations/newOrganization';

const getDefaultOrder = (vendorId, number) => {
  const defaultOrder = {
    id: uuid(),
    poNumber: number,
    vendor: vendorId,
    orderType: 'One-Time',
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
