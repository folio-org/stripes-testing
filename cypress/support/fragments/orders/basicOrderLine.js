import uuid from 'uuid';
import getRandomPostfix from '../../utils/stringTools';
import MaterialTypes from '../settings/inventory/materialTypes';

export const RECEIVING_WORKFLOWS = {
  SYNCHRONIZED: 'Synchronized order and receipt quantity',
  INDEPENDENT: 'Independent order and receipt quantity',
};
export const CHECKIN_ITEMS_VALUE = {
  [RECEIVING_WORKFLOWS.SYNCHRONIZED]: false,
  [RECEIVING_WORKFLOWS.INDEPENDENT]: true,
};

const getDefaultOrderLine = ({
  quantity = 1,
  title = `autotest_po_line_name-${getRandomPostfix()}`,
  instanceId,
  checkinItems = false,
  purchaseOrderId,
  specialLocationId,
  specialMaterialTypeId,
  orderFormat,
  createInventory = 'Instance, Holding, Item',
  acquisitionMethod = '',
  automaticExport = false,
  listUnitPrice = 1,
  poLineEstimatedPrice,
  fundDistribution = [],
  productIds = [],
  vendorDetail,
  referenceNumbers = [],
  vendorAccount = '1234',
  paymentStatus = 'Pending',
  receiptStatus = 'Pending',
  renewalNote,
} = {}) => {
  const defaultOrderLine = {
    id: uuid(),
    checkinItems,
    instanceId,
    acquisitionMethod,
    automaticExport,
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
    orderFormat: orderFormat || specialLocationId ? 'Physical Resource' : 'Other',
    paymentStatus,
    physical: specialLocationId
      ? {
        createInventory,
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
    purchaseOrderId,
    receiptStatus,
    renewalNote,
    source: 'User',
    titleOrPackage: title,
    vendorDetail: vendorDetail || {
      instructions: '',
      vendorAccount,
      referenceNumbers,
    },
  };
  if (specialLocationId && !specialMaterialTypeId) {
    MaterialTypes.createMaterialTypeViaApi(MaterialTypes.getDefaultMaterialType()).then(
      (mtypes) => {
        defaultOrderLine.physical.materialType = mtypes.body.id;
      },
    );
  }
  return defaultOrderLine;
};

export default {
  getDefaultOrderLine,

  defaultOrderLine: {
    id: uuid(),
    checkinItems: false,
    acquisitionMethod: '',
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
      accessProvider: null,
    },
    purchaseOrderId: '',
    receiptStatus: 'Pending',
    source: 'User',
    titleOrPackage: `autotest_title_${getRandomPostfix()}`,
    vendorDetail: {
      instructions: '',
      vendorAccount: '1234',
    },
  },
};
