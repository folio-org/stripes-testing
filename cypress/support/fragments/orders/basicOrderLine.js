import uuid from 'uuid';
import getRandomPostfix from '../../utils/stringTools';
import orders from './orders';

export default {
  defaultOrderLine: {
    id: uuid(),
    checkinItems: false,
    acquisitionMethod: '',
    alerts: [],
    claims: [],
    contributors: [{
      contributor: `Autotest Contributor_${getRandomPostfix()}`,
      contributorNameTypeId: uuid()
    }],
    cost: {
      listUnitPrice: 1.0,
      currency: 'USD',
      discountType: 'percentage',
      quantityPhysical: 2,
      poLineEstimatedPrice: 1.0
    },
    details: {
      productIds: [],
      subscriptionInterval: 0
    },
    fundDistribution: [],
    isPackage: false,
    locations: [
      {
        locationId: '',
        quantity: 2,
        quantityPhysical: 2
      }
    ],
    orderFormat: 'Physical Resource',
    paymentStatus: 'Pending',
    physical: {
      createInventory: 'Instance, Holding, Item',
      materialType: '',
      materialSupplier: '',
      volumes: []
    },
    eresource: {
      activated: false,
      createInventory: 'None',
      trial: false,
      accessProvider: ''
    },
    purchaseOrderId: '',
    receiptStatus: 'Pending',
    reportingCodes: [],
    source: 'User',
    titleOrPackage: `autotest_line_${getRandomPostfix()}`,
    vendorDetail: {
      instructions: '',
      vendorAccount: '1234'
    }
  },
  specialOrderLine: {
    id: uuid(),
    checkinItems: false,
    acquisitionMethod: '',
    alerts: [],
    claims: [],
    contributors: [{
      contributor: `Autotest Contributor_${getRandomPostfix()}`,
      contributorNameTypeId: uuid()
    }],
    cost: {
      listUnitPrice: 1.0,
      currency: 'USD',
      discountType: 'percentage',
      quantityPhysical: 2,
      poLineEstimatedPrice: 1.0
    },
    details: {
      productIds: [{
        productId: '9781868885015',
        productIdType: '8261054f-be78-422d-bd51-4ed9f33c3422'
      }],
      subscriptionInterval: 0
    },
    donor: `Autotest donor_${getRandomPostfix()}`,
    publisher: `Autotest Publishing_${getRandomPostfix()}`,
    requester: `Autotest requester_${getRandomPostfix()}`,
    selector: `Autotest selector_${getRandomPostfix()}`,
    fundDistribution: [],
    isPackage: false,
    locations: [
      {
        locationId: '',
        quantity: 2,
        quantityPhysical: 2
      }
    ],
    orderFormat: 'Physical Resource',
    paymentStatus: 'Pending',
    physical: {
      createInventory: 'Instance, Holding, Item',
      materialType: '',
      materialSupplier: '',
      volumes: ['test vol. 1']
    },
    eresource: {
      activated: false,
      createInventory: 'None',
      trial: false,
      accessProvider: ''
    },
    purchaseOrderId: '',
    receiptStatus: 'Pending',
    reportingCodes: [],
    source: 'User',
    titleOrPackage: `autotest_line_${getRandomPostfix()}`,
    vendorDetail: {
      instructions: `autotest instructions_${getRandomPostfix()}`,
      noteFromVendor: `autotest note_${getRandomPostfix()}`,
      referenceNumbers: [
        {
          refNumber: '123456-78',
          refNumberType: 'Vendor title number',
          vendorDetailsSource: 'OrderLine'
        }
      ],
      vendorAccount: '8910-10'
    },
  }
};
