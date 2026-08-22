import {
  acquisitionUnits,
  batchGroups,
  expenseClasses,
  fiscalYears,
  funds,
  invoices,
  organizations,
} from '../routes';
import { batchCount } from '../utils/batching';
import { responseRecords } from '../utils/responses';
import { tagFilterRoutes } from './common';

/** Invoices resolves vendor organizations referenced by returned invoices. */
export const invoicesProfile = {
  filters: [acquisitionUnits, expenseClasses, fiscalYears, funds, batchGroups, ...tagFilterRoutes],
  results: [invoices],
  responseDependencies: [
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
