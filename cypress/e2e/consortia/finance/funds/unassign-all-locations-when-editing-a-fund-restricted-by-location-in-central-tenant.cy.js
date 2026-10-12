import {
  COMMON_BUTTON_LABELS,
  RESTRICT_USE_BY_LOCATION_LABEL,
} from '../../../../support/constants';
import Affiliations from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import {
  FinanceHelper,
  FiscalYears,
  FundEditForm,
  Funds,
  Ledgers,
} from '../../../../support/fragments/finance';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import { Locations, ServicePoints } from '../../../../support/fragments/settings/tenant';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import { DateTools, ExecutionFlowManager } from '../../../../support/utils';
import getRandomStringCode from '../../../../support/utils/generateTextCode';

describe('Finance', () => {
  describe('Consortium (Finance)', () => {
    const flow = new ExecutionFlowManager();
    const R = {
      LOCALE: 'locale',
      FY: 'fy',
      LEDGER: 'ledger',
      LOCATION_1: 'location1',
      LOCATION_2: 'location2',
      FUND: 'fund',
      USER: 'user',
    };
    const LOCATION_KEYS = [R.LOCATION_1, R.LOCATION_2];

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

    const assertFundLocations = () => {
      FundEditForm.assertLocationsCount(LOCATION_KEYS.length);
      LOCATION_KEYS.forEach((key) => Funds.varifyLocationInSection(flow.get(key).location.name));
      FundEditForm.assertAddLocationButtonEnabled();
      Funds.verifyUnassignAllLocationsButtonState(false);
    };

    const unassignAllLocations = () => {
      Funds.clickUnassignAllLocationsButton();
      Funds.verifyUnassignAllLocationsModal();
      Funds.selectActionInUnassignAllLocationsModal(COMMON_BUTTON_LABELS.CONFIRM);
      Funds.verifyNoLocationsFound();
      Funds.verifyUnassignAllLocationsButtonState(true);
    };

    const assertFundDetails = () => {
      Funds.waitForFundDetailsLoading();
      Funds.verifyCheckboxState(RESTRICT_USE_BY_LOCATION_LABEL, true);
    };

    before('Create C468171 preconditions', () => {
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
          cy.log('Precondition 4: Two locations assigned to the fund');
          return createLocation(f, R.LOCATION_1, Affiliations.Consortia);
        })
        .step((f) => {
          return createLocation(f, R.LOCATION_2, Affiliations.Consortia);
        })
        .step((f) => {
          cy.log(
            'Precondition 4: Active Fund restricted by location related to Ledger from precondition #3 exists in Central tenant',
          );
          return Funds.createViaApi({
            ...Funds.getDefaultFund(),
            ledgerId: f.get(R.LEDGER).id,
            restrictByLocations: true,
            locations: LOCATION_KEYS.map((key) => {
              return {
                locationId: f.get(key).location.id,
                tenantId: Affiliations.Consortia,
              };
            }),
          }).then(({ fund }) => {
            return f.set(R.FUND, fund, (v) => Funds.deleteFundViaApi(v.id, false));
          });
        })
        .step((f) => {
          cy.log(
            'Precondition 6: Finance: View, edit, create fund and budget; Settings (Consortia): Can view network ordering',
          );
          return cy
            .createTempUser([
              Permissions.uiFinanceViewEditCreateFundAndBudget.gui,
              Permissions.settingsConsortiaCanViewNetworkOrdering.gui,
            ])
            .then((user) => f.set(R.USER, user, (v) => Users.deleteViaApi(v.userId)));
        })
        .step((f) => {
          cy.log(
            'Precondition 5: User with "Staff" user type has assigned affiliation in member1 tenant',
          );
          return cy.assignAffiliationToUser(Affiliations.College, f.get(R.USER).userId);
        })
        .step((f) => {
          cy.log(
            'Precondition 5: User with "Staff" user type has assigned affiliation in member2 tenant',
          );
          return cy.assignAffiliationToUser(Affiliations.University, f.get(R.USER).userId);
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

    after('Delete C468171 data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      flow.cleanup();
    });

    it(
      'C468171 ECS | Unassign all locations when editing a fund restricted by location in Central tenant (consortia) (thunderjet)',
      { tags: ['extendedPathECS', 'thunderjet', 'C468171', 'LOC'] },
      () => {
        const fundName = flow.get(R.FUND).name;

        cy.log('<--- STEP 1 --->');
        FinanceHelper.searchByName(fundName);
        Funds.selectFund(fundName);
        assertFundDetails();

        cy.log('<--- STEP 2 --->');
        Funds.editFund();
        FundEditForm.waitLoading();
        assertFundLocations();

        cy.log('<--- STEP 3 --->');
        Funds.clickUnassignAllLocationsButton();
        Funds.verifyUnassignAllLocationsModal();

        cy.log('<--- STEP 4 --->');
        Funds.selectActionInUnassignAllLocationsModal(COMMON_BUTTON_LABELS.CANCEL);
        assertFundLocations();

        cy.log('<--- STEP 5-6 --->');
        unassignAllLocations();

        cy.log('<--- STEP 7 --->');
        Funds.cancelEditingFund();
        Funds.verifyAreYouSureModal();

        cy.log('<--- STEP 8 --->');
        Funds.closeWithoutSaving();
        assertFundDetails();

        cy.log('<--- STEP 9 --->');
        Funds.editFund();
        FundEditForm.waitLoading();
        assertFundLocations();

        cy.log('<--- STEP 10-11 --->');
        unassignAllLocations();

        cy.log('<--- STEP 12 --->');
        Funds.cancelEditingFund();
        Funds.verifyAreYouSureModal();

        cy.log('<--- STEP 13 --->');
        FundEditForm.keepEditingFund();
        Funds.verifyNoLocationsFound();

        cy.log('<--- STEP 14 --->');
        FundEditForm.clickSaveAndCloseButton({ fundSaved: false });
        Funds.varifyLocationSectionExist();
        Funds.varifyLocationRequiredError();
      },
    );
  });
});
