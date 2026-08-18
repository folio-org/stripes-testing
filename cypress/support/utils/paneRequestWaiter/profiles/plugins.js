import {
  acquisitionMethods,
  acquisitionUnits,
  centralOrderingSettings,
  expenseClasses,
  funds,
  fundTypes,
  groups,
  ledgers,
  locations,
  materialTypes,
  organizations,
  organizationTypes,
  orderLines,
  prefixes,
  settingsEntries,
  suffixes,
} from '../routes';
import { tagsDependency } from './common';
import { findFundLedgerDependency } from './finance';

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
    settingsEntries,
  ],
  results: [orderLines],
  responseDependencies: [tagsDependency],
};

export const findOrganizationProfile = {
  filters: [acquisitionUnits, organizationTypes, settingsEntries],
  results: [organizations],
  responseDependencies: [tagsDependency],
};

export const findFundProfile = {
  filters: [acquisitionUnits, fundTypes, groups, ledgers],
  results: [funds],
  responseDependencies: [findFundLedgerDependency],
};
