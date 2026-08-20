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
  isbnConversion,
  orderLines,
  orders,
  prefixes,
  suffixes,
  tenantAddresses,
  users,
  invalidOrderLinesQuery,
} from '../routes';
import { batchCount } from '../utils/batching';
import { hasOrderLineProperty, orderLineRecords, orderRecords } from '../utils/responses';
import { tagFilterRoutes } from './common';

/**
 * Orders renders its list from composite orders, then resolves display values
 * that are stored as IDs: vendor organizations, acquisition units, and users.
 */
export const ordersProfile = {
  filters: [
    acquisitionUnits,
    funds,
    customFields,
    prefixes,
    suffixes,
    closureReasons,
    tenantAddresses,
    ...tagFilterRoutes,
  ],
  results: [orders],
  responseDependencies: [
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

/**
 * Order Lines normally starts with `/orders/order-lines`, then fetches parent
 * orders and their acquisition units. Product ID ISBN searches are different:
 * conversion is the primary request, and the list request is sent only when
 * conversion succeeds. A rejected invalid ISBN therefore ends the chain.
 */
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
    ...tagFilterRoutes,
  ],
  results: [orderLines],
  resultVariants: [
    {
      when: ({ conditions }) => Boolean(conditions.isbnConversion),
      routes: [isbnConversion],
    },
    {
      when: ({ conditions }) => Boolean(conditions.invalidQuery),
      routes: [invalidOrderLinesQuery],
    },
  ],
  responseDependencies: [
    {
      route: orderLines,
      dependsOn: [isbnConversion.id],
      // The route accepts the expected invalid-ISBN 400, but only a successful
      // conversion causes ui-orders to issue the actual order-line search.
      when: ({ responses }) => responses[isbnConversion.id].response.statusCode < 400,
    },
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
