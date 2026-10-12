import { PRIMARY_LABEL, RESTRICT_USE_BY_LOCATION_LABEL } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import { FiscalYears, FundEditForm, Funds, Ledgers } from '../../../../support/fragments/finance';
import SelectLocationsModal from '../../../../support/fragments/finance/modals/selectLocationsModal';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import { Locations, ServicePoints } from '../../../../support/fragments/settings/tenant';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import { DateTools, ExecutionFlowManager } from '../../../../support/utils';
import getRandomStringCode from '../../../../support/utils/generateTextCode';
import getRandomPostfix from '../../../../support/utils/stringTools';

const FUND_NAME_PREFIX = 'AT_C466311_Fund';
const LOCATION_NAME_PREFIX = 'AT_C466311_LOC';

const CENTRAL_TENANT_LABEL = `${tenantNames.central} (${PRIMARY_LABEL})`;

describe('Finance', () => {
  describe('Consortium (Finance)', () => {
    const flow = new ExecutionFlowManager();
    const R = {
      LOCALE: 'locale',
      FY: 'fy',
      LEDGER: 'ledger',
      CENTRAL_LOCATION_1: 'centralLocation1',
      CENTRAL_LOCATION_2: 'centralLocation2',
      CENTRAL_LOCATION_3: 'centralLocation3',
      MEMBER_LOCATION_1: 'memberLocation1',
      MEMBER_LOCATION_2: 'memberLocation2',
      FUND: 'fund',
      USER: 'user',
    };

    const createLocation = (f, key, tenantId) => {
      cy.withinTenant(tenantId, () => {
        ServicePoints.getViaApi({ limit: 1 }).then(([servicePoint]) => {
          const data = Locations.getDefaultLocation({
            servicePointId: servicePoint.id,
            locationName: `${LOCATION_NAME_PREFIX}_${key}_${getRandomPostfix()}`,
          });

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

    const getLocationNames = (...keys) => keys.map((key) => flow.get(key).location.name);

    const selectLocations = (locationNames, checked = true) => {
      locationNames.forEach((locationName) => {
        SelectLocationsModal.searchLocation(locationName);
        SelectLocationsModal.toggleLocationCheckbox(locationName);
        SelectLocationsModal.assertLocationChecked(locationName, checked);
      });
    };

    const assertLocationsChecked = (locationNames) => {
      locationNames.forEach((locationName) => {
        SelectLocationsModal.searchLocation(locationName);
        SelectLocationsModal.assertLocationChecked(locationName, true);
      });
    };

    const assertFundLocations = ({ centralLocationNames, memberLocationNames }) => {
      const locationNames = [...centralLocationNames, ...memberLocationNames];

      FundEditForm.assertLocationsGroupedByTenant([
        { tenantName: tenantNames.central, locationNames: centralLocationNames },
        { tenantName: tenantNames.college, locationNames: memberLocationNames },
      ]);
      FundEditForm.assertLocationsCount(locationNames.length);
      locationNames.forEach((locationName) => {
        FundEditForm.assertLocationRemovable(locationName, true);
      });
      FundEditForm.assertAddLocationButtonEnabled();
      Funds.verifyUnassignAllLocationsButtonState(false);
    };

    const assertAllFundLocations = () => {
      assertFundLocations({
        centralLocationNames: getLocationNames(
          R.CENTRAL_LOCATION_1,
          R.CENTRAL_LOCATION_2,
          R.CENTRAL_LOCATION_3,
        ),
        memberLocationNames: getLocationNames(R.MEMBER_LOCATION_1, R.MEMBER_LOCATION_2),
      });
    };

    before('Create C466311 preconditions', () => {
      cy.resetTenant();
      cy.getAdminToken();

      flow
        .step((f) => {
          return cy.getTenantLocaleApi().then((locale) => f.set(R.LOCALE, locale));
        })
        .step((f) => {
          cy.log('Precondition 1: At least one active Fiscal Year exists in Central tenant');
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
            'Precondition 2: One active Ledger related to Fiscal Year from precondition #1 exists in Central tenant',
          );
          return Ledgers.createViaApi({
            ...Ledgers.getDefaultLedger(),
            fiscalYearOneId: f.get(R.FY).id,
          }).then((ledger) => {
            return f.set(R.LEDGER, ledger, (v) => Ledgers.deleteLedgerViaApi(v.id, false));
          });
        })
        .step(() => {
          cy.log(
            'Precondition 3: "Allow user to select locations from other affiliations for central orders" option is active in Central tenant',
          );
          return ConsortiumManager.enableCentralOrderingViaApi();
        })
        .step((f) => {
          // Locations to be assigned to the fund in Central tenant
          return createLocation(f, R.CENTRAL_LOCATION_1, Affiliations.Consortia);
        })
        .step((f) => {
          return createLocation(f, R.CENTRAL_LOCATION_2, Affiliations.Consortia);
        })
        .step((f) => {
          return createLocation(f, R.CENTRAL_LOCATION_3, Affiliations.Consortia);
        })
        .step((f) => {
          // Locations to be assigned to the fund in member1 tenant
          return createLocation(f, R.MEMBER_LOCATION_1, Affiliations.College);
        })
        .step((f) => {
          return createLocation(f, R.MEMBER_LOCATION_2, Affiliations.College);
        })
        .step((f) => {
          // Fund is created in the test; cleanup is registered up front so it also runs after a failure
          const fund = {
            ...Funds.getDefaultFund(),
            name: `${FUND_NAME_PREFIX}_${getRandomPostfix()}`,
            ledgerName: f.get(R.LEDGER).name,
          };

          return f.set(R.FUND, fund, (v) => {
            return Funds.getFundsViaApi({ query: `name=="${v.name}"` }).then(({ funds }) => {
              funds.forEach((createdFund) => Funds.deleteFundViaApi(createdFund.id, false));
            });
          });
        })
        .step((f) => {
          cy.log(
            'Precondition 5: Finance: View, edit, create fund and budget; Settings (Consortia): Can view network ordering - in Central tenant',
          );
          return cy
            .createTempUser([
              Permissions.uiFinanceViewEditCreateFundAndBudget.gui,
              Permissions.settingsConsortiaCanViewNetworkOrdering.gui,
            ])
            .then((user) => f.set(R.USER, user, (v) => Users.deleteViaApi(v.userId)));
        })
        .step((f) => {
          cy.log(`
              Precondition 4: User with "Staff" user type has assigned affiliation in member1 tenant
              Precondition 5: Finance: View, edit, create fund and budget - in member1 tenant
          `);
          return cy.affiliateUserToTenant({
            tenantId: Affiliations.College,
            userId: f.get(R.USER).userId,
            permissions: [Permissions.uiFinanceViewEditCreateFundAndBudget.gui],
          });
        })
        .step((f) => {
          cy.log(
            'Precondition 6: User is logged in Central tenant and is on "Finance" app main page',
          );
          return cy
            .login(f.get(R.USER).username, f.get(R.USER).password, {
              path: TopMenu.fundPath,
              waiter: Funds.waitLoading,
            })
            .then(() => ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central));
        });
    });

    after('Delete C466311 data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      flow.cleanup();
    });

    it(
      'C466311 ECS | Marking Fund as restricted by location when create and edit a fund in Central tenant (consortia) (thunderjet)',
      { tags: ['extendedPathECS', 'thunderjet', 'C466311', 'LOC'] },
      () => {
        const [centralLocation1, centralLocation2, centralLocation3] = getLocationNames(
          R.CENTRAL_LOCATION_1,
          R.CENTRAL_LOCATION_2,
          R.CENTRAL_LOCATION_3,
        );
        const [memberLocation1, memberLocation2] = getLocationNames(
          R.MEMBER_LOCATION_1,
          R.MEMBER_LOCATION_2,
        );

        cy.log('<--- STEP 1 --->');
        Funds.newFund();
        FundEditForm.waitLoading();
        Funds.verifyCheckboxState(RESTRICT_USE_BY_LOCATION_LABEL, false);

        cy.log('<--- STEP 2 --->');
        Funds.fillInRequiredFields(flow.get(R.FUND));
        Funds.clickRestrictByLocationsCheckbox();
        Funds.verifyCheckboxState(RESTRICT_USE_BY_LOCATION_LABEL, true);
        Funds.varifyLocationSectionExist();
        FundEditForm.assertLocationsCount(0);
        Funds.varifyLocationRequiredError();

        cy.log('<--- STEP 3 --->');
        FundEditForm.clickSaveAndCloseButton({ fundSaved: false });
        Funds.varifyLocationSectionExist();
        Funds.verifyCheckboxState(RESTRICT_USE_BY_LOCATION_LABEL, true);
        Funds.varifyLocationRequiredError();

        cy.log('<--- STEP 4 --->');
        Funds.openAddLocationModal();
        SelectLocationsModal.assertModalElements({ affiliationName: CENTRAL_TENANT_LABEL });

        cy.log('<--- STEP 5 --->');
        SelectLocationsModal.assertAffiliationOptions([CENTRAL_TENANT_LABEL, tenantNames.college]);

        cy.log('<--- STEP 6 --->');
        SelectLocationsModal.selectAffiliation(CENTRAL_TENANT_LABEL);
        selectLocations([centralLocation1]);
        SelectLocationsModal.assertSelectedRecordsCount(1);

        cy.log('<--- STEP 7 --->');
        SelectLocationsModal.clickClose();
        FundEditForm.assertLocationsCount(0);

        cy.log('<--- STEP 8 --->');
        Funds.openAddLocationModal();
        selectLocations([centralLocation1, centralLocation2, centralLocation3]);
        SelectLocationsModal.assertSelectedRecordsCount(3);

        cy.log('<--- STEP 9 --->');
        SelectLocationsModal.selectAffiliation(tenantNames.college);
        selectLocations([memberLocation1, memberLocation2]);
        SelectLocationsModal.assertSelectedRecordsCount(5);

        cy.log('<--- STEP 10 --->');
        Funds.saveLocationsModal();
        assertAllFundLocations();

        cy.log('<--- STEP 11 --->');
        FundEditForm.clickSaveAndCloseButton();
        Funds.waitForFundDetailsLoading();
        Funds.verifyCheckboxState(RESTRICT_USE_BY_LOCATION_LABEL, true);

        cy.log('<--- STEP 12 --->');
        Funds.editFund();
        FundEditForm.waitLoading();
        Funds.verifyCheckboxState(RESTRICT_USE_BY_LOCATION_LABEL, true);
        assertAllFundLocations();

        cy.log('<--- STEP 13 --->');
        Funds.openAddLocationModal();
        SelectLocationsModal.assertSelectedAffiliation(CENTRAL_TENANT_LABEL);
        assertLocationsChecked([centralLocation1, centralLocation2, centralLocation3]);
        SelectLocationsModal.assertSelectedRecordsCount(5);

        cy.log('<--- STEP 14 --->');
        selectLocations([centralLocation2, centralLocation3], false);
        SelectLocationsModal.selectAffiliation(tenantNames.college);
        assertLocationsChecked([memberLocation1, memberLocation2]);
        SelectLocationsModal.assertSelectedRecordsCount(3);

        cy.log('<--- STEP 15 --->');
        selectLocations([memberLocation2], false);
        SelectLocationsModal.selectAffiliation(CENTRAL_TENANT_LABEL);
        assertLocationsChecked([centralLocation1]);
        SelectLocationsModal.assertSelectedRecordsCount(2);

        cy.log('<--- STEP 16 --->');
        Funds.saveLocationsModal();
        assertFundLocations({
          centralLocationNames: [centralLocation1],
          memberLocationNames: [memberLocation1],
        });

        cy.log('<--- STEP 17 --->');
        Funds.openAddLocationModal();
        selectLocations([centralLocation2, centralLocation3]);
        SelectLocationsModal.selectAffiliation(tenantNames.college);

        const institutionForFilter = flow.get(R.MEMBER_LOCATION_2).institution;
        SelectLocationsModal.filterByInstitutions([
          `${institutionForFilter.name} (${institutionForFilter.code})`,
        ]);
        selectLocations([memberLocation2]);
        SelectLocationsModal.assertSelectedRecordsCount(5);

        cy.log('<--- STEP 18 --->');
        Funds.saveLocationsModal();
        assertAllFundLocations();

        cy.log('<--- STEP 19 --->');
        FundEditForm.clickSaveAndCloseButton();
        Funds.waitForFundDetailsLoading();
        Funds.verifyCheckboxState(RESTRICT_USE_BY_LOCATION_LABEL, true);
      },
    );
  });
});
