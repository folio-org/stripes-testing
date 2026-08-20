import {
  acquisitionUnits,
  batchGroups,
  expenseClasses,
  fiscalYears,
  funds,
  invoices,
  organizations,
  settingsEntries,
} from '../routes';
import { batchCount } from '../utils/batching';
import { responseRecords } from '../utils/responses';
import { tagsDependency } from './common';

export const invoicesProfile = {
  filters: [acquisitionUnits, expenseClasses, fiscalYears, funds, batchGroups, settingsEntries],
  results: [invoices],
  responseDependencies: [
    tagsDependency,
    {
      route: organizations,
      dependsOn: [invoices.id],
      when: ({ responses }) => {
        return responseRecords(responses, invoices.id, 'invoices').some(({ vendorId }) => vendorId);
      },
      requestCount: batchCount((responses) => {
        return responseRecords(responses, invoices.id, 'invoices').map(({ vendorId }) => vendorId);
      }),
    },
  ],
};
