import uuid from 'uuid';
import getRandomPostfix from '../../utils/stringTools';
import NewMaterialType from '../settings/inventory/newMaterialType';

export const RECEIVING_WORKFLOWS = {
  SYNCHRONIZED: 'Synchronized order and receipt quantity',
  INDEPENDENT: 'Independent order and receipt quantity',
};

const getDefaultOrderLine = ({
  quantity = 1,
  title = `autotest_po_line_name-${getRandomPostfix()}`,
  instanceId,
  checkinItems = false,
  specialLocationId,
  specialMaterialTypeId,
  acquisitionMethod = '',
  listUnitPrice = 1,
  poLineEstimatedPrice,
  fundDistribution = [],
  productIds = [],
  referenceNumbers = [],
  vendorAccount = '1234',
} = {}) => {
  const defaultOrderLine = {
    id: uuid(),
    checkinItems,
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
    locations: specialLocationId
      ? [
        {
          locationId: specialLocationId,
          quantity,
          quantityPhysical: quantity,
        },
      ]
      : [],
    orderFormat: specialLocationId ? 'Physical Resource' : 'Other',
    paymentStatus: 'Pending',
    physical: specialLocationId
      ? {
        createInventory: 'Instance, Holding, Item',
        materialType: specialMaterialTypeId,
        materialSupplier: null,
        volumes: [],
      }
      : {
        createInventory: 'None',
        materialSupplier: 'c2b9b8a0-3d87-42d4-aa26-03fd90b22ebd',
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
