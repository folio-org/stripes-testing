import uuid from 'uuid';
import getRandomPostfix from '../../utils/stringTools';

export default {
  defaultOrderLine: {
    id: uuid(),
    checkinItems: false,
    acquisitionMethod: '',
    claims: [],
    contributors: [
      {
        contributor: `AC-${getRandomPostfix()}`,
        contributorNameTypeId: uuid(),
      },
    ],
    requester: `AR-${getRandomPostfix()}`,
    donor: `AD-${getRandomPostfix()}`,
    cost: {
      listUnitPrice: 1.0,
      currency: 'USD',
      discountType: 'percentage',
      quantityPhysical: 2,
      poLineEstimatedPrice: 1.0,
    },
    details: {
      productIds: [
        {
          productId: '9780552142359',
          productIdType: '',
          qualifier: '(paperback)',
        },
      ],
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
      volumes: ['testvol1'],
    },
    selector: `AS-${getRandomPostfix()}`,
    publisher: `AP-${getRandomPostfix()}`,
    eresource: {
      activated: false,
      createInventory: 'None',
      trial: false,
      accessProvider: '',
    },
    purchaseOrderId: '',
    receiptStatus: 'Pending',
    source: 'User',
    titleOrPackage: `autotest_line_${getRandomPostfix()}`,
    vendorDetail: {
      instructions: `AI-${getRandomPostfix()}`,
      noteFromVendor: `autotest note_${getRandomPostfix()}`,
      referenceNumbers: [
        {
          refNumber: '123456-78',
          refNumberType: 'Vendor title number',
          vendorDetailsSource: 'OrderLine',
        },
      ],
      vendorAccount: '8910-10',
    },
  },
};
