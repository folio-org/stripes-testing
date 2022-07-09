import uuid from 'uuid';
import NewOrganization from '../organizations/newOrganization';

const getDefaultOrder = (vendorId) => {
  const defaultOrder = {
    id: uuid(),
    vendor: vendorId,
    orderType: 'One-Time'
  };
  if (!vendorId) {
    NewOrganization.createViaApi(NewOrganization.getDefaultOrganization())
      .then(newOrganization => {
        defaultOrder.vendor = newOrganization.id;
      });
  }
  return defaultOrder;
};

export default {
  defaultOneTimeOrder: {
    id: uuid(),
    vendor: '',
    orderType: 'One-time'
  }
};
