import { DEFAULT_WAIT_TIME, RESTRICT_USE_BY_LOCATION_LABEL } from '../../../../support/constants';
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

const FUND_NAME_PREFIX = 'AT_C468164_Fund';

describe('Finance', () => {
  describe('Consortium (Finance)', () => {
    const flow = new ExecutionFlowManager();
    const R = {
      LOCALE: 'locale',
      FY: 'fy',
      LEDGER: 'ledger',
      LOCATION_1: 'location1',
      LOCATION_2: 'location2',
      LOCATION_3: 'location3',
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

    const getLocationNames = (...keys) => keys.map((key) => flow.get(key).location.name);

    const assertFundLocations = (locationNames) => {
      FundEditForm.assertLocationsCount(locationNames.length);
      locationNames.forEach((locationName) => {
        Funds.varifyLocationInSection(locationName);
        FundEditForm.assertLocationRemovable(locationName, true);
      });
    };

    before('Create C468164 preconditions', () => {
      cy.resetTenant();
      cy.getAdminToken();
      flow
        .step((f) => {
          cy.withinTenant(Affiliations.College, () => {
            cy.getTenantLocaleApi().then((locale) => f.set(R.LOCALE, locale));
          });
        })
        .step((f) => {
          cy.log('Precondition 1: One active Fiscal Year exists in member1 tenant');
          const series = getRandomStringCode(4);
          const periods = DateTools.getFullFiscalYearStartAndEnd();

          cy.withinTenant(Affiliations.College, () => {
            FiscalYears.createViaApi({
              ...FiscalYears.getDefaultFiscalYear(),
              ...periods,
              series,
              code: `${series}${new Date(periods.periodStart).getFullYear()}`,
              currency: f.get(R.LOCALE).currency,
            }).then((fy) => {
              f.set(R.FY, fy, (v) => {
                cy.withinTenant(Affiliations.College, () => {
                  FiscalYears.deleteFiscalYearViaApi(v.id, false);
                });
              });
            });
          });
        })
        .step((f) => {
          cy.log(
            'Precondition 2: One active Ledger related to Fiscal Year from precondition #1 exists in member1 tenant',
          );
          cy.withinTenant(Affiliations.College, () => {
            Ledgers.createViaApi({
              ...Ledgers.getDefaultLedger(),
              fiscalYearOneId: f.get(R.FY).id,
            }).then((ledger) => {
              f.set(R.LEDGER, ledger, (v) => {
                cy.withinTenant(Affiliations.College, () => {
                  Ledgers.deleteLedgerViaApi(v.id, false);
                });
              });
            });
          });
        })
        .step(() => {
          cy.log(
            'Precondition 3: "Allow user to select locations from other affiliations for central orders" option is active in Central tenant',
          );
          ConsortiumManager.enableCentralOrderingViaApi();
        })
        .step((f) => {
          // Locations to be assigned to the fund in member1 tenant
          createLocation(f, R.LOCATION_1, Affiliations.College);
        })
        .step((f) => {
          createLocation(f, R.LOCATION_2, Affiliations.College);
        })
        .step((f) => {
          createLocation(f, R.LOCATION_3, Affiliations.College);
        })
        .step((f) => {
          // Fund is created in the test; cleanup is registered up front so it also runs after a failure
          const fund = {
            ...Funds.getDefaultFund(),
            name: `${FUND_NAME_PREFIX}_${getRandomPostfix()}`,
            ledgerName: f.get(R.LEDGER).name,
          };

          f.set(R.FUND, fund, (v) => {
            cy.withinTenant(Affiliations.College, () => {
              Funds.getFundsViaApi({ query: `name=="${v.name}"` }).then(({ funds }) => {
                funds.forEach((createdFund) => Funds.deleteFundViaApi(createdFund.id, false));
              });
            });
          });
        })
        .step((f) => {
          cy.log(
            'Precondition 5: Settings (Consortia): Can view network ordering - in Central tenant',
          );
          return cy
            .createTempUser([Permissions.settingsConsortiaCanViewNetworkOrdering.gui])
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
            'Precondition 4: User with "Staff" user type has assigned affiliation in member2 tenant',
          );
          return cy.assignAffiliationToUser(Affiliations.University, f.get(R.USER).userId, {
            waitMs: DEFAULT_WAIT_TIME,
          });
        })
        .step((f) => {
          cy.log(
            'Precondition 5-6: User is logged in member1 tenant and is on "Finance" app main page',
          );
          cy.login(f.get(R.USER).username, f.get(R.USER).password);
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          cy.visit(TopMenu.fundPath);

          return Funds.waitLoading();
        });
    });

    after('Delete C468164 data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      flow.cleanup();
    });

    it(
      'C468164 ECS | Marking Fund as restricted by location when create and edit a fund in Member tenant (consortia) (thunderjet)',
      { tags: ['extendedPathECS', 'thunderjet', 'C468164', 'LOC'] },
      () => {
        const [location1, location2, location3] = getLocationNames(
          R.LOCATION_1,
          R.LOCATION_2,
          R.LOCATION_3,
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
        SelectLocationsModal.assertModalElements();

        cy.log('<--- STEP 5 --->');
        [location1, location2].forEach((locationName) => {
          SelectLocationsModal.searchLocation(locationName);
          SelectLocationsModal.toggleLocationCheckbox(locationName);
          SelectLocationsModal.assertLocationChecked(locationName, true);
        });
        SelectLocationsModal.assertSelectedRecordsCount(2);

        cy.log('<--- STEP 6 --->');
        Funds.saveLocationsModal();
        assertFundLocations([location1, location2]);
        Funds.verifyUnassignAllLocationsButtonState(false);

        cy.log('<--- STEP 7 --->');
        FundEditForm.clickSaveAndCloseButton();
        Funds.waitForFundDetailsLoading();
        Funds.verifyCheckboxState(RESTRICT_USE_BY_LOCATION_LABEL, true);

        cy.log('<--- STEP 8 --->');
        Funds.editFund();
        FundEditForm.waitLoading();
        Funds.verifyCheckboxState(RESTRICT_USE_BY_LOCATION_LABEL, true);
        assertFundLocations([location1, location2]);

        cy.log('<--- STEP 9 --->');
        Funds.openAddLocationModal();

        const campusForFilter = flow.get(R.LOCATION_3).campus;
        SelectLocationsModal.filterByCampuses([
          `${campusForFilter.name} (${campusForFilter.code})`,
        ]);
        SelectLocationsModal.toggleLocationCheckbox(location3);
        SelectLocationsModal.assertLocationChecked(location3, true);
        SelectLocationsModal.assertSelectedRecordsCount(3);

        cy.log('<--- STEP 10 --->');
        Funds.saveLocationsModal();
        assertFundLocations([location1, location2, location3]);
        FundEditForm.assertLocationsRequiredWarningAbsent();

        cy.log('<--- STEP 11 --->');
        FundEditForm.clickSaveAndCloseButton();
        Funds.waitForFundDetailsLoading();
        Funds.verifyCheckboxState(RESTRICT_USE_BY_LOCATION_LABEL, true);
      },
    );
  });
});
