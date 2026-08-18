import {
  acquisitionMethods,
  acquisitionUnits,
  centralOrderingSettings,
  closureReasons,
  customFields,
  expenseClasses,
  funds,
  locations,
  materialTypes,
  organizations,
  orderLines,
  orders,
  prefixes,
  settingsEntries,
  suffixes,
  tenantAddresses,
  users,
} from '../routes';
import { batchCount } from '../utils/batching';
import { hasOrderLineProperty, orderLineRecords, orderRecords } from '../utils/responses';
import { tagsDependency } from './common';

export const ordersProfile = {
  filters: [
    acquisitionUnits,
    funds,
    customFields,
    prefixes,
    suffixes,
    closureReasons,
    tenantAddresses,
    settingsEntries,
  ],
  results: [orders],
  responseDependencies: [
    tagsDependency,
    {
      route: organizations,
      dependsOn: [orders.id],
      when: ({ responses }) => orderRecords(responses).some(({ vendor }) => vendor),
      requestCount: batchCount((responses) => orderRecords(responses).map(({ vendor }) => vendor)),
    },
    {
      route: acquisitionUnits,
      dependsOn: [orders.id],
      when: ({ responses }) => {
        return orderRecords(responses).some(({ acqUnitIds = [] }) => acqUnitIds.length);
      },
      requestCount: batchCount((responses) => {
        return orderRecords(responses).flatMap(({ acqUnitIds = [] }) => acqUnitIds);
      }),
    },
    {
      route: users,
      dependsOn: [orders.id],
      when: ({ responses }) => orderRecords(responses).some(({ assignedTo }) => assignedTo),
      requestCount: batchCount((responses) => {
        return orderRecords(responses).map(({ assignedTo }) => assignedTo);
      }),
    },
  ],
};

export const orderLinesProfile = {
  filters: [
    acquisitionUnits,
    expenseClasses,
    funds,
    acquisitionMethods,
    customFields,
    locations,
    materialTypes,
    prefixes,
    suffixes,
    centralOrderingSettings,
    settingsEntries,
  ],
  results: [orderLines],
  responseDependencies: [
    tagsDependency,
    {
      route: orders,
      dependsOn: [orderLines.id],
      when: ({ responses }) => hasOrderLineProperty(responses, 'purchaseOrderId'),
      requestCount: batchCount((responses) => {
        return orderLineRecords(responses).map(({ purchaseOrderId }) => purchaseOrderId);
      }),
    },
    {
      route: acquisitionUnits,
      dependsOn: [orders.id],
      when: ({ responses }) => {
        return orderRecords(responses).some(({ acqUnitIds = [] }) => acqUnitIds.length);
      },
      requestCount: batchCount((responses) => {
        return orderRecords(responses).flatMap(({ acqUnitIds = [] }) => acqUnitIds);
      }),
    },
  ],
};
