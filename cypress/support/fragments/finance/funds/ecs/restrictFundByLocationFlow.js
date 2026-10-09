import uuid from 'uuid';

import Permissions from '../../../../dictionary/permissions';
import getRandomPostfix from '../../../../utils/stringTools';

import FiscalYears from '../../fiscalYears/fiscalYears';
import Ledgers from '../../ledgers/ledgers';
import Funds from '../funds';
import Users from '../../../users/users';

import NewLocation from '../../../settings/tenant/locations/newLocation';
import ServicePoints from '../../../settings/tenant/servicePoints/servicePoints';

import Affiliations, { tenantNames } from '../../../../dictionary/affiliations';

import { ECS_FUND_LOCATION_KEYS as R } from './constants';

const buildLocationsCleanupKey = (key) => `${key}_CLEANUP`;

const buildIsolationTag = () => `_${getRandomPostfix()}`;

const buildUiFund = (ledgerName, isolationTag) => ({
  ...Funds.defaultUiFund,
  name: `fund_${getRandomPostfix()}${isolationTag}`,
  code: `fund_${getRandomPostfix()}${isolationTag}`,
  ledgerName,
});

const createFyLedgerInCurrentTenant = (flow, { fyKey, ledgerKey }) => {
  const fy = { ...FiscalYears.defaultUiFiscalYear };
  const ledger = { ...Ledgers.defaultUiLedger };

  return FiscalYears.createViaApi(fy).then((createdFy) => {
    fy.id = createdFy.id;
    flow.set(fyKey, fy, () => FiscalYears.deleteFiscalYearViaApi(fy.id));

    ledger.fiscalYearOneId = fy.id;

    return Ledgers.createViaApi(ledger).then((createdLedger) => {
      ledger.id = createdLedger.id;
      ledger.name = createdLedger.name;
      flow.set(ledgerKey, ledger, () => Ledgers.deleteLedgerViaApi(ledger.id));
    });
  });
};

const createLocationsInTenant = (flow, { tenantId, key, count }) => {
  cy.setTenant(tenantId);

  return ServicePoints.getViaApi({ limit: 1 }).then((servicePoints) => {
    const spId = servicePoints[0].id;
    const locations = [];

    const createOne = () => {
      const location = NewLocation.getDefaultLocation(spId);

      return NewLocation.createViaApi(location).then((created) => {
        locations.push(created);
      });
    };

    // Create sequentially to ensure deterministic Cypress chaining
    return cy
      .wrap(Cypress._.range(count), { log: false })
      .each(() => createOne())
      .then(() => {
        flow.set(key, locations);

        // One cleanup per batch, stored via a stable key (ExecutionFlowManager has no addCleanup)
        flow.set(buildLocationsCleanupKey(key), locations, () => locations.forEach((loc) => NewLocation.deleteInstitutionCampusLibraryLocationViaApi(
          loc.institutionId,
          loc.campusId,
          loc.libraryId,
          loc.id,
        )));
      });
  });
};

const createCentralRestrictedFundViaApi = (flow, { fundKey, ledgerKey, locationIds }) => {
  cy.setTenant(Affiliations.Consortia);
  const ledger = flow.get(ledgerKey);

  const fund = Funds.getDefaultFund();
  fund.id = uuid();
  fund.ledgerId = ledger.id;
  fund.restrictByLocations = true;
  fund.locations = locationIds.map((locationId) => ({ locationId }));

  return Funds.createViaApi(fund).then((resp) => {
    const created = resp.fund || resp;
    flow.set(fundKey, created, () => Funds.deleteFundViaApi(created.id, false));
  });
};

const createUserWithAffiliations = (flow, { centralOnlyPermissions = [] }) => {
  cy.setTenant(Affiliations.Consortia);

  return cy
    .createTempUser([
      Permissions.uiFinanceViewEditCreateFundAndBudget.gui,
      ...centralOnlyPermissions,
    ])
    .then((user) => {
      flow.set(R.USER, user, () => Users.deleteViaApi(user.userId));

      // member1
      cy.affiliateUserToTenant({
        tenantId: Affiliations.College,
        userId: user.userId,
        permissions: [Permissions.uiFinanceViewEditCreateFundAndBudget.gui],
      });

      // member2
      cy.affiliateUserToTenant({
        tenantId: Affiliations.University,
        userId: user.userId,
        permissions: [Permissions.uiFinanceViewEditCreateFundAndBudget.gui],
      });
    });
};

export default {
  init(flow) {
    flow.set(R.ISOLATION_TAG, buildIsolationTag());

    cy.getTenantLocaleApi().then((locale) => flow.set(R.LOCALE, locale));
  },

  createCentralFyLedger(flow) {
    cy.setTenant(Affiliations.Consortia);
    return createFyLedgerInCurrentTenant(flow, {
      fyKey: R.CENTRAL_FISCAL_YEAR,
      ledgerKey: R.CENTRAL_LEDGER,
    });
  },

  createMember1FyLedger(flow) {
    cy.setTenant(Affiliations.College);
    return createFyLedgerInCurrentTenant(flow, {
      fyKey: R.MEMBER1_FISCAL_YEAR,
      ledgerKey: R.MEMBER1_LEDGER,
    });
  },

  createEcsUser(flow, centralOnlyPermissions) {
    return createUserWithAffiliations(flow, { centralOnlyPermissions });
  },

  createLocationsCentral(flow, count = 3) {
    return createLocationsInTenant(flow, {
      tenantId: Affiliations.Consortia,
      key: R.CENTRAL_LOCATIONS,
      count,
    });
  },

  createLocationsMember1(flow, count = 2) {
    return createLocationsInTenant(flow, {
      tenantId: Affiliations.College,
      key: R.MEMBER1_LOCATIONS,
      count,
    });
  },

  createLocationsMember2(flow, count = 1) {
    return createLocationsInTenant(flow, {
      tenantId: Affiliations.University,
      key: R.MEMBER2_LOCATIONS,
      count,
    });
  },

  createCentralRestrictedFund(
    flow,
    { useCentralCount = 2, useMember1Count = 0, useMember2Count = 0 } = {},
  ) {
    const centralLocs = (flow.get(R.CENTRAL_LOCATIONS) || []).slice(0, useCentralCount);
    const member1Locs = (flow.get(R.MEMBER1_LOCATIONS) || []).slice(0, useMember1Count);
    const member2Locs = (flow.get(R.MEMBER2_LOCATIONS) || []).slice(0, useMember2Count);

    const locationIds = [...centralLocs, ...member1Locs, ...member2Locs].map((l) => l.id);

    return createCentralRestrictedFundViaApi(flow, {
      fundKey: R.CENTRAL_FUND,
      ledgerKey: R.CENTRAL_LEDGER,
      locationIds,
    });
  },

  buildUiFundForCentral(flow) {
    const ledger = flow.get(R.CENTRAL_LEDGER);
    const isolationTag = flow.get(R.ISOLATION_TAG);
    return buildUiFund(ledger.name, isolationTag);
  },

  buildUiFundForMember1(flow) {
    const ledger = flow.get(R.MEMBER1_LEDGER);
    const isolationTag = flow.get(R.ISOLATION_TAG);
    return buildUiFund(ledger.name, isolationTag);
  },

  verifyUserTenantsInAffiliationDropdown() {
    cy.contains(tenantNames.central).should('be.visible');
    cy.contains(tenantNames.college).should('be.visible');
  },
};
