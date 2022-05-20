import uuid from 'uuid';
import { REQUEST_METHOD } from '../../constants';
import NewOrganization from '../organizations/newOrganization';

const getDefaultOrder = (vendorId) => {
  const defaultOrder = {
    id: uuid(),
    vendor: vendorId,
    orderType: 'One-Time'
  };
  if (!vendorId) {
    cy.okapiRequest({
      method: REQUEST_METHOD.POST,
      path: 'organizations/organizations',
      body: NewOrganization.specialOrganization,
    })
      .then(newOrganization => {
        defaultOrder.vendor = newOrganization.id;
      });
  }
  return defaultOrder;
};

export default {
  defaultOrder: {
    id: uuid(),
    vendor: '',
    orderType: 'One-Time'
  },

  getDefaultOrder,
};
