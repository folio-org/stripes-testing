import {
  acquisitionUnits,
  claimingPieces,
  customFields,
  locations,
  materialTypes,
  organizations,
  tenantAddresses,
} from '../routes';
import { batchCount } from '../utils/batching';
import { responseRecords } from '../utils/responses';
import { tagFilterRoutes } from './common';

/** Claiming resolves each wrapper piece's vendor ID for the result table. */
export const claimingProfile = {
  filters: [
    acquisitionUnits,
    customFields,
    locations,
    materialTypes,
    tenantAddresses,
    ...tagFilterRoutes,
  ],
  results: [claimingPieces],
  responseDependencies: [
    {
      route: organizations,
      dependsOn: [claimingPieces.id],
      when: ({ responses }) => {
        return responseRecords(responses, claimingPieces.id, 'wrapperPieces').some(
          ({ vendorId }) => vendorId,
        );
      },
      requestCount: batchCount((responses) => {
        return responseRecords(responses, claimingPieces.id, 'wrapperPieces').map(
          ({ vendorId }) => vendorId,
        );
      }),
    },
  ],
};
