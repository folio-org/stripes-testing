import uuid from 'uuid';
import getRandomPostfix from '../../utils/stringTools';
import NewMaterialType from '../settings/inventory/newMaterialType';

const getDefaultOrderLine = ({
  quantity = '1',
  title = `autotest_po_line_name-${getRandomPostfix()}`,
  instanceId,
  specialLocationId,
  specialMaterialTypeId,
  acquisitionMethod = '',
  listUnitPrice = '1.0',
  poLineEstimatedPrice = '1.0',
  fundDistribution = [],
  productIds = [],
  referenceNumbers = [],
  vendorAccount = '1234',
}) => {
  const defaultOrderLine = {
    id: uuid(),
    checkinItems: false,
    instanceId,
    acquisitionMethod,
    alerts: [],
    claims: [],
    contributors: [],
    cost: {
      listUnitPrice,
      currency: 'USD',
      discountType: 'percentage',
      quantityPhysical: quantity,
      poLineEstimatedPrice,
    },
    details: {
      productIds,
      subscriptionInterval: 0,
    },
    fundDistribution,
    isPackage: false,
    locations: [
      {
        locationId: specialLocationId,
        quantity,
        quantityPhysical: quantity,
      },
    ],
    orderFormat: 'Physical Resource',
    paymentStatus: 'Pending',
    physical: {
      createInventory: 'Instance, Holding, Item',
      materialType: specialMaterialTypeId,
      materialSupplier: null,
      volumes: [],
    },
    eresource: {
      activated: false,
      createInventory: 'None',
      trial: false,
      accessProvider: null,
    },
    purchaseOrderId: '',
    receiptStatus: 'Pending',
    reportingCodes: [],
    source: 'User',
    titleOrPackage: title,
    vendorDetail: {
      instructions: '',
      vendorAccount,
      referenceNumbers,
    },
  };
  if (!defaultOrderLine.physical.materialType) {
    NewMaterialType.createViaApi(NewMaterialType.getDefaultMaterialType()).then((mtypes) => {
      defaultOrderLine.physical.materialType = mtypes.body.id;
    });
  }
  return defaultOrderLine;
};

export default {
  getDefaultOrderLine,

  defaultOrderLine: {
    id: uuid(),
    checkinItems: false,
    acquisitionMethod: '',
    alerts: [],
    claims: [],
    contributors: [],
    cost: {
      listUnitPrice: 1.0,
      currency: 'USD',
      discountType: 'percentage',
      quantityPhysical: 2,
      poLineEstimatedPrice: 1.0,
    },
    details: {
      productIds: [],
      subscriptionInterval: 0,
    },
    fundDistribution: [],
    isPackage: false,
    locations: [
      {
        locationId: '',
        quantity: 2,
        quantityPhysical: 2,
      },
    ],
    orderFormat: 'Physical Resource',
    paymentStatus: 'Pending',
    physical: {
      createInventory: 'Instance, Holding, Item',
      materialType: '',
      materialSupplier: '',
      volumes: [],
    },
    eresource: {
      activated: false,
      createInventory: 'None',
      trial: false,
      accessProvider: '',
    },
    purchaseOrderId: '',
    receiptStatus: 'Pending',
    reportingCodes: [],
    source: 'User',
    titleOrPackage: `autotest_title_${getRandomPostfix()}`,
    vendorDetail: {
      instructions: '',
      vendorAccount: '1234',
    },
  },
};
