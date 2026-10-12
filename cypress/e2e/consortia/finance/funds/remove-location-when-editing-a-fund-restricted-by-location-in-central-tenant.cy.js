import { PRIMARY_LABEL, RESTRICT_USE_BY_LOCATION_LABEL } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import {
  FinanceHelper,
  FiscalYears,
  FundEditForm,
  Funds,
  Ledgers,
} from '../../../../support/fragments/finance';
import SelectLocationsModal, {
  LOCATION_ASSIGNMENT_STATUSES,
} from '../../../../support/fragments/finance/modals/selectLocationsModal';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import { Locations, ServicePoints } from '../../../../support/fragments/settings/tenant';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import { DateTools, ExecutionFlowManager } from '../../../../support/utils';
import getRandomStringCode from '../../../../support/utils/generateTextCode';

const ASSIGNED_STATUS = LOCATION_ASSIGNMENT_STATUSES.ASSIGNED;
const CENTRAL_TENANT_LABEL = `${tenantNames.central} (${PRIMARY_LABEL})`;

describe('Finance', () => {
  describe('Consortium (Finance)', () => {
    const flow = new ExecutionFlowManager();
    const R = {
      LOCALE: 'locale',
      FY: 'fy',
      LEDGER: 'ledger',
      CENTRAL_LOCATION: 'centralLocation',
      MEMBER1_LOCATION: 'member1Location',
      MEMBER2_LOCATION: 'member2Location',
      FUND: 'fund',
      USER: 'user',
    };

    const createLocation = (f, key, tenantId) => {
      cy.withinTenant(tenantId, () => {
        ServicePoints.getViaApi({ limit: 1 }).then(([servicePoint]) => {
          const data = Locations.getDefaultLocation({ servicePointId: servicePoint.id });

          Locations.createViaApi(data.location).then((location) => {
            f.set(key, { ...data, location, tenantId }, () => {
              cy.withinTenant(tenantId, () => {
                Locations.deleteViaApi({
                  id: location.id,
                  libraryId: location.libraryId,
                  campusId: location.campusId,
                  institutionId: location.institutionId,
                });
              });
            });
          });
        });
      });
    };

    // Locations from Central and member1 are removable; member2 is not an affiliation of the user
    const assertFundLocations = (removableKeys, notRemovableKeys) => {
      const locationKeys = [...removableKeys, ...notRemovableKeys];

      Funds.varifyLocationSectionExist();
      FundEditForm.assertLocationsCount(locationKeys.length);
      locationKeys.forEach((key) => Funds.varifyLocationInSection(flow.get(key).location.name));
      removableKeys.forEach((key) => {
        FundEditForm.assertLocationRemovable(flow.get(key).location.name, true);
      });
      notRemovableKeys.forEach((key) => {
        FundEditForm.assertLocationRemovable(flow.get(key).location.name, false);
      });
      FundEditForm.assertAddLocationButtonEnabled();
      FundEditForm.assertUnassignAllLocationsButtonAbsent();
    };

    const assertFundDetails = () => {
      Funds.waitForFundDetailsLoading();
      Funds.verifyCheckboxState(RESTRICT_USE_BY_LOCATION_LABEL, true);
    };

    before('Create C468166 preconditions', () => {
      cy.resetTenant();
      cy.getAdminToken();
      flow
        .step(() => {
          cy.log(
            'Precondition 1: "Allow user to select locations from other affiliations for central orders" option is active in Central tenant',
          );
          return ConsortiumManager.enableCentralOrderingViaApi();
        })
        .step((f) => {
          return cy.getTenantLocaleApi().then((locale) => f.set(R.LOCALE, locale));
        })
        .step((f) => {
          cy.log(
            'Precondition 2: Fiscal Year (current date is included in FY period) exists in Central tenant',
          );
          const series = getRandomStringCode(4);
          const periods = DateTools.getFullFiscalYearStartAndEnd();

          return FiscalYears.createViaApi({
            ...FiscalYears.getDefaultFiscalYear(),
            ...periods,
            series,
            code: `${series}${new Date(periods.periodStart).getFullYear()}`,
            currency: f.get(R.LOCALE).currency,
          }).then((fy) => {
            return f.set(R.FY, fy, (v) => FiscalYears.deleteFiscalYearViaApi(v.id, false));
          });
        })
        .step((f) => {
          cy.log(
            'Precondition 3: One active Ledger related to Fiscal Year from precondition #2 exists in Central tenant',
          );
          return Ledgers.createViaApi({
            ...Ledgers.getDefaultLedger(),
            fiscalYearOneId: f.get(R.FY).id,
          }).then((ledger) => {
            return f.set(R.LEDGER, ledger, (v) => Ledgers.deleteLedgerViaApi(v.id, false));
          });
        })
        .step((f) => {
          cy.log('Precondition 4: Assigned location from Central tenant');
          return createLocation(f, R.CENTRAL_LOCATION, Affiliations.Consortia);
        })
        .step((f) => {
          cy.log('Precondition 4: Assigned location from member-1 tenant');
          return createLocation(f, R.MEMBER1_LOCATION, Affiliations.College);
        })
        .step((f) => {
          cy.log('Precondition 4: Assigned location from member-2 tenant');
          return createLocation(f, R.MEMBER2_LOCATION, Affiliations.University);
        })
        .step((f) => {
          cy.log(
            'Precondition 4: Active restricted by location Fund related to Ledger from precondition #3 exists in Central tenant',
          );
          return Funds.createViaApi({
            ...Funds.getDefaultFund(),
            ledgerId: f.get(R.LEDGER).id,
            restrictByLocations: true,
            locations: [R.CENTRAL_LOCATION, R.MEMBER1_LOCATION, R.MEMBER2_LOCATION].map((key) => {
              return { locationId: f.get(key).location.id, tenantId: f.get(key).tenantId };
            }),
          }).then(({ fund }) => {
            return f.set(R.FUND, fund, (v) => Funds.deleteFundViaApi(v.id, false));
          });
        })
        .step((f) => {
          cy.log(
            'Precondition 6: Finance: View, edit fund and budget; Settings (Consortia): Can view network ordering - in Central tenant',
          );
          return cy
            .createTempUser([
              Permissions.uiFinanceViewEditFundAndBudget.gui,
              Permissions.settingsConsortiaCanViewNetworkOrdering.gui,
            ])
            .then((user) => f.set(R.USER, user, (v) => Users.deleteViaApi(v.userId)));
        })
        .step((f) => {
          cy.log(`
            Precondition 5: User with "Staff" user type has assigned affiliation in member1 tenant
            Precondition 6: Finance: View, edit fund and budget - in member1 tenant
          `);
          return cy.affiliateUserToTenant({
            tenantId: Affiliations.College,
            userId: f.get(R.USER).userId,
            permissions: [Permissions.uiFinanceViewEditFundAndBudget.gui],
          });
        })
        .step((f) => {
          cy.log(
            'Precondition 6-7: User is logged in Central tenant and is on "Finance" app main page',
          );
          return cy.login(f.get(R.USER).username, f.get(R.USER).password, {
            path: TopMenu.fundPath,
            waiter: Funds.waitLoading,
          });
        });
    });

    after('Delete C468166 data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      flow.cleanup();
    });

    it(
      'C468166 ECS | Remove location when editing a fund restricted by location in Central tenant (consortia) (thunderjet)',
      { tags: ['extendedPathECS', 'thunderjet', 'C468166', 'LOC'] },
      () => {
        const fundName = flow.get(R.FUND).name;
        const centralTenantLocationName = flow.get(R.CENTRAL_LOCATION).location.name;

        cy.log('<--- STEP 1 --->');
        FinanceHelper.searchByName(fundName);
        Funds.selectFund(fundName);
        assertFundDetails();

        cy.log('<--- STEP 2 --->');
        Funds.editFund();
        FundEditForm.waitLoading();
        assertFundLocations([R.CENTRAL_LOCATION, R.MEMBER1_LOCATION], [R.MEMBER2_LOCATION]);

        cy.log('<--- STEP 3 --->');
        FundEditForm.removeLocation(centralTenantLocationName);

        cy.log('<--- STEP 4 --->');
        Funds.cancelEditingFund();
        Funds.verifyAreYouSureModal();

        cy.log('<--- STEP 5 --->');
        Funds.closeWithoutSaving();
        assertFundDetails();

        cy.log('<--- STEP 6 --->');
        Funds.editFund();
        FundEditForm.waitLoading();
        assertFundLocations([R.CENTRAL_LOCATION, R.MEMBER1_LOCATION], [R.MEMBER2_LOCATION]);

        cy.log('<--- STEP 7 --->');
        FundEditForm.removeLocation(flow.get(R.MEMBER1_LOCATION).location.name);

        cy.log('<--- STEP 8 --->');
        Funds.cancelEditingFund();
        Funds.verifyAreYouSureModal();

        cy.log('<--- STEP 9 --->');
        FundEditForm.keepEditingFund();
        FundEditForm.assertLocationsCount(2);
        Funds.varifyLocationIsAbsentInSection(flow.get(R.MEMBER1_LOCATION).location.name);

        cy.log('<--- STEP 10 --->');
        FundEditForm.clickSaveAndCloseButton();
        assertFundDetails();

        cy.log('<--- STEP 11 --->');
        Funds.editFund();
        FundEditForm.waitLoading();
        assertFundLocations([R.CENTRAL_LOCATION], [R.MEMBER2_LOCATION]);

        cy.log('<--- STEP 12 --->');
        Funds.openAddLocationModal();
        SelectLocationsModal.assertSelectedAffiliation(CENTRAL_TENANT_LABEL);
        SelectLocationsModal.assertSelectedRecordsCount(2);

        cy.log('<--- STEP 13 --->');
        SelectLocationsModal.assertAffiliationOptions([CENTRAL_TENANT_LABEL, tenantNames.college]);

        cy.log('<--- STEP 14 --->');
        SelectLocationsModal.filterByAssignmentStatus(ASSIGNED_STATUS);
        SelectLocationsModal.assertLocationChecked(centralTenantLocationName, true);
        SelectLocationsModal.assertLocationAssignmentStatus(
          centralTenantLocationName,
          ASSIGNED_STATUS,
        );
      },
    );
  });
});
