import { Permissions } from '../../../support/dictionary';
import getRandomPostfix from '../../../support/utils/stringTools';
import { DateTools, ExecutionFlowManager } from '../../../support/utils';
import { FUND_DISTRIBUTION_TYPES } from '../../../support/constants/finance/fund';
import { ORDER_TYPES } from '../../../support/constants/orders/order';
import Budgets from '../../../support/fragments/finance/budgets/budgets';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import Orders from '../../../support/fragments/orders/orders';
import OrderTemplateFormFragment from '../../../support/fragments/settings/orders/orderTemplateForm';
import MultiYearPaymentTerms from '../../../support/fragments/orders/multiYearPaymentTerms';

import OrderTemplates from '../../../support/fragments/settings/orders/orderTemplates';
import SettingOrdersNavigationMenu from '../../../support/fragments/settings/orders/settingOrdersNavigationMenu';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import NewLocation from '../../../support/fragments/settings/tenant/locations/newLocation';
import { ServicePoints } from '../../../support/fragments/settings/tenant';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomStringCode from '../../../support/utils/generateTextCode';

const OrderTemplateForm = { ...OrderTemplateFormFragment, ...MultiYearPaymentTerms };

describe('Settings | Orders', () => {
  const flow = new ExecutionFlowManager();

  const R = {
    LOC1: 'loc1',
    LOC2: 'loc2',
    LOC3: 'loc3',
    FY1: 'fy1',
    FY2: 'fy2',
    LEDGER: 'ledger',
    FUND_A: 'fundA',
    FUND_B: 'fundB',
    FUND_C: 'fundC',
    BUDGET_A: 'budgetA',
    BUDGET_B: 'budgetB',
    BUDGET_C1: 'budgetC1',
    BUDGET_C2: 'budgetC2',
    SP: 'servicePoint',
    TEMPLATE: 'template',
    USER: 'user',
  };

  const testData = {
    templateName: `AT_Template_${getRandomPostfix()}`,
  };

  before(() => {
    cy.getAdminToken();
    cy.clearLocalStorage();

    // Precondition 1: Get 3 distinct system locations (Loc1, Loc2, Loc3)
    flow
      .step((f) => {
        return ServicePoints.getViaApi().then((servicePoints) => f.set(R.SP, servicePoints[0]));
      })
      .step((f) => {
        [R.LOC1, R.LOC2, R.LOC3].forEach((key) => {
          const locationData = NewLocation.getDefaultLocation(
            f.get(R.SP).id,
            `AT_Location_${key}_${getRandomPostfix()}`,
          );

          NewLocation.createViaApi(locationData).then((location) => {
            f.set(key, location, () => NewLocation.deleteInstitutionCampusLibraryLocationViaApi(
              locationData.institutionId,
              locationData.campusId,
              locationData.libraryId,
              location.id,
            ));
          });
        });
      })
      // Precondition 1: Create current FY (FY1) and future FY (FY2)
      .step((f) => {
        const series = getRandomStringCode(5);

        [R.FY1, R.FY2].forEach((key, index) => {
          FiscalYears.createViaApi({
            ...FiscalYears.getDefaultFiscalYear(),
            ...DateTools.getFullFiscalYearStartAndEnd(index),
            code: `${series}${new Date().getFullYear() + index}`,
            series,
          }).then((fy) => {
            f.set(key, fy, () => FiscalYears.deleteFiscalYearViaApi(fy.id));
          });
        });
      })
      // Precondition 2: Create active Ledger related to FY1
      .step((f) => {
        const { fy1 } = f.ctx();
        return Ledgers.createViaApi({
          ...Ledgers.getDefaultLedger(),
          fiscalYearOneId: fy1.id,
        }).then((ledger) => {
          f.set(R.LEDGER, ledger, () => Ledgers.deleteLedgerViaApi(ledger.id));
        });
      })
      // Precondition 3: Create Fund A restricted to Loc1
      .step((f) => {
        const { ledger, loc1 } = f.ctx();
        return Funds.createViaApi({
          ...Funds.getDefaultFund(),
          ledgerId: ledger.id,
          restrictByLocations: true,
          locations: [{ locationId: loc1.id }],
        }).then((response) => {
          f.set(R.FUND_A, response.fund, () => Funds.deleteFundViaApi(response.fund.id));
        });
      })
      // Precondition 3: Create Fund B restricted to Loc2
      .step((f) => {
        const { ledger, loc2 } = f.ctx();
        return Funds.createViaApi({
          ...Funds.getDefaultFund(),
          ledgerId: ledger.id,
          restrictByLocations: true,
          locations: [{ locationId: loc2.id }],
        }).then((response) => {
          f.set(R.FUND_B, response.fund, () => Funds.deleteFundViaApi(response.fund.id));
        });
      })
      // Precondition 4: Create Fund C not restricted by location
      .step((f) => {
        const { ledger } = f.ctx();
        return Funds.createViaApi({
          ...Funds.getDefaultFund(),
          ledgerId: ledger.id,
        }).then((response) => {
          f.set(R.FUND_C, response.fund, () => Funds.deleteFundViaApi(response.fund.id));
        });
      })
      // Precondition 5: Create budgets with allocation for all funds
      .step((f) => {
        const { fundA, fy1 } = f.ctx();
        return Budgets.createViaApi({
          ...Budgets.getDefaultBudget(),
          fiscalYearId: fy1.id,
          fundId: fundA.id,
        }).then((budget) => {
          f.set(R.BUDGET_A, budget, () => Budgets.deleteViaApi(budget.id));
        });
      })
      .step((f) => {
        const { fundB, fy1 } = f.ctx();
        return Budgets.createViaApi({
          ...Budgets.getDefaultBudget(),
          fiscalYearId: fy1.id,
          fundId: fundB.id,
        }).then((budget) => {
          f.set(R.BUDGET_B, budget, () => Budgets.deleteViaApi(budget.id));
        });
      })
      .step((f) => {
        const { fundC, fy1 } = f.ctx();
        return Budgets.createViaApi({
          ...Budgets.getDefaultBudget(),
          fiscalYearId: fy1.id,
          fundId: fundC.id,
        }).then((budget) => {
          f.set(R.BUDGET_C1, budget, () => Budgets.deleteViaApi(budget.id));
        });
      })
      .step((f) => {
        const { fundC, fy2 } = f.ctx();
        return Budgets.createViaApi({
          ...Budgets.getDefaultBudget(),
          fiscalYearId: fy2.id,
          fundId: fundC.id,
        }).then((budget) => {
          f.set(R.BUDGET_C2, budget, () => Budgets.deleteViaApi(budget.id));
        });
      })
      // Precondition 6: Create order template with multi-year prepayment, Fund C in both FY cards, Location = Loc3
      .step((f) => {
        const { fy1, fy2, fundC, loc3 } = f.ctx();
        return OrderTemplates.createOrderTemplateViaApi({
          ...OrderTemplates.getDefaultOrderTemplate({}),
          templateName: testData.templateName,
          orderType: ORDER_TYPES.ONGOING,
          multiYearPayment: true,
          paymentTerms: {
            totalPrice: 100,
            prepaymentTerm: 2,
            startingFiscalYearId: fy1.id,
            fiscalYearDistributions: [
              {
                fiscalYearId: fy1.id,
                fundDistributions: [
                  { fundId: fundC.id, distributionType: FUND_DISTRIBUTION_TYPES.AMOUNT, value: 50 },
                ],
              },
              {
                fiscalYearId: fy2.id,
                fundDistributions: [
                  { fundId: fundC.id, distributionType: FUND_DISTRIBUTION_TYPES.AMOUNT, value: 50 },
                ],
              },
            ],
          },
          locations: [{ locationId: loc3.id }],
        }).then((template) => {
          f.set(R.TEMPLATE, template, () => OrderTemplates.deleteOrderTemplateViaApi(template.id));
        });
      })
      // Precondition 7: Make Fund C restricted by location with Loc1
      .step((f) => {
        const { fundC, loc1 } = f.ctx();
        return Funds.updateFundViaApi({
          ...fundC,
          restrictByLocations: true,
          locations: [{ locationId: loc1.id }],
        });
      })
      // Precondition 8: Create authorized user with template settings capability
      .step((f) => {
        return cy
          .createTempUser([Permissions.uiSettingsOrdersCanViewEditCreateNewOrderTemplates.gui])
          .then((userProperties) => {
            f.set(R.USER, userProperties, () => Users.deleteViaApi(userProperties.userId));
          });
      })
      // Precondition 9: User is on "Settings" → "Orders" → "Order templates" pane
      .step((f) => {
        const { user } = f.ctx();
        cy.login(user.username, user.password, {
          path: TopMenu.settingsOrdersPath,
          waiter: Orders.waitSettingsPageLoading,
        });
        SettingOrdersNavigationMenu.selectOrderTemplates();
        OrderTemplates.waitLoading();
      });
  });

  after(() => {
    cy.getAdminToken();
    flow.cleanup();
  });

  it(
    'C1474740 Fund restriction validation for the multiyear payment order template (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C1474740'] },
    () => {
      const { loc1, loc2, loc3, fy1, fy2, fundA, fundB } = flow.ctx();

      cy.log('Step 1. Click on the order template from Preconditions');
      OrderTemplates.selectTemplate(testData.templateName);
      // Expected: Template details page displayed; error toast "Location-restricted fund applied to invalid location" appears
      OrderTemplates.checkFundRestrictionErrorToastPresent();
      InteractorsTools.closeAllVisibleCallouts();

      cy.log('Step 2. Click "Actions" button; Select "Edit" option');
      OrderTemplates.openEditForm();
      // Expected: Edit order template page displayed

      cy.log(
        'Step 3. Click "Add location" button in the "Location" accordion; Expand "Name (code)" dropdown',
      );
      OrderTemplateForm.clickExpandAllAccordions();
      OrderTemplateForm.clickAddLocationButton();
      // Template already has Loc3 at index 0; new empty row is at index 1
      OrderTemplateForm.expandLocationNameCodeDropdown(1);
      // Expected: "Name (code)" dropdown contains all Locations (Loc1, Loc2, Loc3)
      cy.expect([
        OrderTemplateForm.locationOptionExists(loc1.name),
        OrderTemplateForm.locationOptionExists(loc2.name),
        OrderTemplateForm.locationOptionExists(loc3.name),
      ]);

      cy.log('Step 4. Select Loc 1 in the "Name (code)" dropdown; Click "Save" button');
      OrderTemplateForm.selectLocationFromDropdown(loc1.name);
      OrderTemplateForm.clickSaveButton();
      // Expected: "The template was saved" toast; Settings app displayed with all templates

      cy.log('Step 5. Click on just edited template');
      OrderTemplates.selectTemplate(testData.templateName);
      // Expected: Template details pane displayed; error toast does NOT appear
      OrderTemplates.checkFundRestrictionErrorToastAbsent();

      cy.log('Step 6. Click "Actions" button; Select "Edit" option');
      OrderTemplates.openEditForm();
      OrderTemplateForm.clickExpandAllAccordions();
      // Expected: Edit order template page displayed

      cy.log(
        'Step 7. Select Fund A in the Fiscal year 1 card instead of Fund C; Select Fund B in the Fiscal year 2 card instead of Fund C; Click "Save" button',
      );
      OrderTemplateForm.selectFundInPaymentTermsCard({
        fyCode: fy1.code,
        fundName: fundA.name,
        fundCode: fundA.code,
      });
      OrderTemplateForm.selectFundInPaymentTermsCard({
        fyCode: fy2.code,
        fundName: fundB.name,
        fundCode: fundB.code,
      });
      OrderTemplateForm.clickSaveButton();
      // Expected: "The template was saved" toast; Settings app displayed

      cy.log('Step 8. Click on just edited template');
      OrderTemplates.selectTemplate(testData.templateName);
      // Expected: Template details page displayed; error toast "Location-restricted fund applied to invalid location" appears
      // (Fund B requires Loc2 but template only has Loc3 and Loc1)
      OrderTemplates.checkFundRestrictionErrorToastPresent();
      InteractorsTools.closeAllVisibleCallouts();

      cy.log('Step 9. Click "Actions" button; Select "Edit" option');
      OrderTemplates.openEditForm();
      OrderTemplateForm.clickExpandAllAccordions();
      // Expected: Edit order template page displayed

      cy.log('Step 10. Remove both locations; Add Loc 2; Click "Save" button');
      // Remove Loc3 (index 0) → Loc1 shifts to index 0
      OrderTemplateForm.removeLocationByIndex(0);
      // Remove Loc1 (now at index 0)
      OrderTemplateForm.removeLocationByIndex(0);
      OrderTemplateForm.clickAddLocationButton();
      // Template now has 0 locations; new row is at index 0
      OrderTemplateForm.expandLocationNameCodeDropdown(0);
      OrderTemplateForm.selectLocationFromDropdown(loc2.name);
      OrderTemplateForm.clickSaveButton();
      // Expected: "The template was saved" toast; Settings app displayed

      cy.log('Step 11. Click on just edited template');
      OrderTemplates.selectTemplate(testData.templateName);
      // Expected: Template details page displayed; error toast appears
      // (Fund A requires Loc1 but template only has Loc2)
      OrderTemplates.checkFundRestrictionErrorToastPresent();
      InteractorsTools.closeAllVisibleCallouts();

      cy.log('Step 12. Click "Actions" button; Select "Edit" option');
      OrderTemplates.openEditForm();
      OrderTemplateForm.clickExpandAllAccordions();
      // Expected: Edit order template page displayed

      cy.log('Step 13. Add Loc 1; Click "Save" button');
      OrderTemplateForm.clickAddLocationButton();
      // Template has Loc2 at index 0; new empty row is at index 1
      OrderTemplateForm.expandLocationNameCodeDropdown(1);
      OrderTemplateForm.selectLocationFromDropdown(loc1.name);
      OrderTemplateForm.clickSaveButton();
      // Expected: "The template was saved" toast; Settings app displayed

      cy.log('Step 14. Click on just edited template');
      OrderTemplates.selectTemplate(testData.templateName);
      // Expected: Template details pane displayed; error toast does NOT appear
      // (Fund A requires Loc1 ✓, Fund B requires Loc2 ✓ — both satisfied by template's locations)
      OrderTemplates.checkFundRestrictionErrorToastAbsent();
    },
  );
});
