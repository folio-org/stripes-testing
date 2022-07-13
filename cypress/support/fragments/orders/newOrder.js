import uuid from 'uuid';
import NewOrganization from '../organizations/newOrganization';

const getDefaultOrder = (vendorId, number) => {
  const defaultOrder = {
    id: uuid(),
    poNumber: number,
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
  getDefaultOrder,
  defaultOneTimeOrder: {
    id: uuid(),
    vendor: '',
    orderType: 'One-time'
  }
};
