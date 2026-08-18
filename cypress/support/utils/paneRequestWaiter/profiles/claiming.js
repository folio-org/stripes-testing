import {
  acquisitionUnits,
  claimingPieces,
  customFields,
  locations,
  materialTypes,
  organizations,
  settingsEntries,
  tenantAddresses,
} from '../routes';
import { batchCount } from '../utils/batching';
import { responseRecords } from '../utils/responses';
import { tagsDependency } from './common';

export const claimingProfile = {
  filters: [
    acquisitionUnits,
    customFields,
    locations,
    materialTypes,
    settingsEntries,
    tenantAddresses,
  ],
  results: [claimingPieces],
  responseDependencies: [
    tagsDependency,
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
