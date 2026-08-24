import { PANE_REQUEST_PROFILE_NAMES } from '../constants';
import { validateProfiles } from '../utils/profileValidation';
import { claimingProfile } from './claiming';
import { fiscalYearsProfile, fundsProfile, groupsProfile, ledgersProfile } from './finance';
import { invoicesProfile } from './invoices';
import { orderLinesProfile, ordersProfile } from './orders';
import { organizationsProfile } from './organizations';
import { findFundProfile, findOrganizationProfile, findPoLineProfile } from './plugins';
import { receivingProfile } from './receiving';

const profiles = {
  [PANE_REQUEST_PROFILE_NAMES.ORDERS]: ordersProfile,
  [PANE_REQUEST_PROFILE_NAMES.ORDER_LINES]: orderLinesProfile,
  [PANE_REQUEST_PROFILE_NAMES.ORGANIZATIONS]: organizationsProfile,
  [PANE_REQUEST_PROFILE_NAMES.RECEIVING]: receivingProfile,
  [PANE_REQUEST_PROFILE_NAMES.INVOICES]: invoicesProfile,
  [PANE_REQUEST_PROFILE_NAMES.CLAIMING]: claimingProfile,
  [PANE_REQUEST_PROFILE_NAMES.FISCAL_YEARS]: fiscalYearsProfile,
  [PANE_REQUEST_PROFILE_NAMES.LEDGERS]: ledgersProfile,
  [PANE_REQUEST_PROFILE_NAMES.GROUPS]: groupsProfile,
  [PANE_REQUEST_PROFILE_NAMES.FUNDS]: fundsProfile,
  [PANE_REQUEST_PROFILE_NAMES.FIND_PO_LINE]: findPoLineProfile,
  [PANE_REQUEST_PROFILE_NAMES.FIND_ORGANIZATION]: findOrganizationProfile,
  [PANE_REQUEST_PROFILE_NAMES.FIND_FUND]: findFundProfile,
};

const freezeProfile = (profile) => {
  return Object.freeze({
    ...profile,
    filters: Object.freeze([...(profile.filters || [])]),
    results: Object.freeze([...(profile.results || [])]),
    resultVariants: Object.freeze(
      (profile.resultVariants || []).map((variant) => Object.freeze({
        ...variant,
        routes: Object.freeze([...variant.routes]),
      })),
    ),
    responseDependencies: Object.freeze(
      (profile.responseDependencies || []).map((dependency) => {
        return Object.freeze({
          ...dependency,
          dependsOn: Object.freeze([...dependency.dependsOn]),
        });
      }),
    ),
  });
};

const validatedProfiles = validateProfiles(profiles);

export const PANE_REQUEST_PROFILES = Object.freeze(
  Object.fromEntries(
    Object.entries(validatedProfiles).map(([name, profile]) => [name, freezeProfile(profile)]),
  ),
);
