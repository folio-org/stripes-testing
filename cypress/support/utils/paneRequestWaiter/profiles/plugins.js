import {
  acquisitionMethods,
  acquisitionUnits,
  centralOrderingSettings,
  expenseClasses,
  funds,
  fundTypes,
  groups,
  invalidOrderLinesQuery,
  isbnConversion,
  ledgers,
  locations,
  materialTypes,
  organizations,
  organizationTypes,
  orderLines,
  prefixes,
  suffixes,
} from '../routes';
import { tagFilterRoutes } from './common';
import { findFundLedgerDependency } from './finance';

/**
 * Find PO Line shares the Order Lines search flow, including the conditional
 * ISBN conversion request, but does not expand results into parent orders.
 */
export const findPoLineProfile = {
  filters: [
    acquisitionUnits,
    expenseClasses,
    funds,
    acquisitionMethods,
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
      // Invalid ISBN conversion is terminal; successful conversion starts the
      // plugin's order-line request.
      when: ({ responses }) => responses[isbnConversion.id].response.statusCode < 400,
    },
  ],
};

/** Find Organization loads organization types/tags, then one organization list. */
export const findOrganizationProfile = {
  filters: [acquisitionUnits, organizationTypes, ...tagFilterRoutes],
  results: [organizations],
};

/** Find Fund reuses the mounted plugin's ledger cache between result actions. */
export const findFundProfile = {
  filters: [acquisitionUnits, fundTypes, groups, ledgers],
  results: [funds],
  responseDependencies: [findFundLedgerDependency],
};
