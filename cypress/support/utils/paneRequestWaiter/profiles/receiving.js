import {
  acquisitionUnits,
  centralOrderingSettings,
  consortiumHoldings,
  defaultReceivingSearchSettings,
  holdings,
  locations,
  materialTypes,
  orderLines,
  orders,
  receivingTitles,
  settingsEntries,
} from '../routes';
import { batchCount, rawBatchCount } from '../utils/batching';
import {
  hasLocalHoldingLocation,
  hasOrderLineHolding,
  hasOrderLineLocation,
  hasOrderLineProperty,
  orderLineRecords,
  responseRecords,
} from '../utils/responses';
import { tagsDependency } from './common';

const localLocationIds = (responses) => [
  ...orderLineRecords(responses).flatMap(({ locations: lineLocations = [] }) => {
    return lineLocations.map(({ locationId }) => locationId);
  }),
  ...responseRecords(responses, holdings.id, 'holdingsRecords').map(
    ({ permanentLocationId }) => permanentLocationId,
  ),
];

export const receivingProfile = {
  filters: [
    acquisitionUnits,
    locations,
    materialTypes,
    centralOrderingSettings,
    defaultReceivingSearchSettings,
    settingsEntries,
  ],
  results: [receivingTitles],
  responseDependencies: [
    tagsDependency,
    {
      route: orderLines,
      dependsOn: [receivingTitles.id],
      when: ({ responses }) => {
        return responseRecords(responses, receivingTitles.id, 'titles').some(
          ({ poLineId }) => poLineId,
        );
      },
      requestCount: rawBatchCount((responses) => {
        return responseRecords(responses, receivingTitles.id, 'titles').map(
          ({ poLineId }) => poLineId,
        );
      }),
    },
    {
      route: holdings,
      dependsOn: [orderLines.id],
      when: ({ conditions, responses }) => {
        return !conditions.crossTenant && hasOrderLineHolding(responses);
      },
      requestCount: batchCount((responses) => {
        return orderLineRecords(responses).flatMap(({ locations: lineLocations = [] }) => {
          return lineLocations.map(({ holdingId }) => holdingId);
        });
      }),
    },
    {
      route: consortiumHoldings,
      dependsOn: [orderLines.id],
      when: ({ conditions, responses }) => {
        return Boolean(conditions.crossTenant) && hasOrderLineProperty(responses, 'instanceId');
      },
    },
    {
      route: locations,
      dependsOn: [orderLines.id],
      when: ({ conditions, responses }) => {
        if (conditions.crossTenant) return orderLineRecords(responses).length > 0;

        return hasOrderLineLocation(responses) || hasLocalHoldingLocation(responses);
      },
      requestCount: ({ conditions, responses }) => {
        if (conditions.crossTenant) return 1;

        return batchCount(localLocationIds)({ responses });
      },
    },
    {
      route: orders,
      dependsOn: [orderLines.id],
      when: ({ responses }) => hasOrderLineProperty(responses, 'purchaseOrderId'),
      requestCount: batchCount((responses) => {
        return orderLineRecords(responses).map(({ purchaseOrderId }) => purchaseOrderId);
      }),
    },
  ],
};
