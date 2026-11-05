import CapabilitySets from '../../../support/dictionary/capabilitySets';
import Budgets from '../../../support/fragments/finance/budgets/budgets';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import Orders from '../../../support/fragments/orders/orders';
import OrderTemplateForm from '../../../support/fragments/settings/orders/orderTemplateForm';
import OrderTemplates from '../../../support/fragments/settings/orders/orderTemplates';
import SettingOrdersNavigationMenu from '../../../support/fragments/settings/orders/settingOrdersNavigationMenu';
import Locations from '../../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Orders', () => {
  describe('Settings (Orders)', () => {
    let testData;

    before('Create test data', () => {
      testData = {
        templateName: `AT_C435901_OrderTemplate_${getRandomPostfix()}`,
      };

      cy.getAdminToken();
      // Precondition 2: restricted location (assigned to Fund) and a different location
      Locations.getViaApiAnyDefault(2).then((locations) => {
        [testData.restrictedLocation, testData.otherLocation] = locations;
      });
      FiscalYears.getCurrentFiscalYearOrCreateViaApi().then((fiscalYear) => {
        Ledgers.createViaApi({
          ...Ledgers.getDefaultLedger(),
          name: `AT_C435901_Ledger_${getRandomPostfix()}`,
          fiscalYearOneId: fiscalYear.id,
        }).then((ledger) => {
          testData.ledger = ledger;

          // Precondition 1, 2: Fund restricted by location with one location assigned
          Funds.createViaApi({
            ...Funds.getDefaultFund(),
            name: `AT_C435901_Fund_${getRandomPostfix()}`,
            ledgerId: ledger.id,
            restrictByLocations: true,
            locations: [{ locationId: testData.restrictedLocation.id }],
          }).then(({ fund }) => {
            testData.fund = fund;

            // Precondition 3: Current budget with money allocation
            Budgets.createViaApi({
              ...Budgets.getDefaultBudget(),
              name: `AT_C435901_Budget_${getRandomPostfix()}`,
              fiscalYearId: fiscalYear.id,
              fundId: fund.id,
            }).then((budget) => {
              testData.budget = budget;
            });
          });
        });
      });

      // Precondition 4: User with order templates settings capability set
      cy.createTempUser([]).then((userProperties) => {
        testData.user = userProperties;

        cy.assignCapabilitiesToExistingUser(
          testData.user.userId,
          [],
          [CapabilitySets.uiOrdersSettingsOrderTemplatesCreate],
        );

        // Precondition 5: User is on "Settings" -> "Orders" -> "Order templates"
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.settingsOrdersPath,
          waiter: Orders.waitSettingsPageLoading,
        });
        SettingOrdersNavigationMenu.selectOrderTemplates();
        OrderTemplates.waitLoading();
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      OrderTemplates.getOrderTemplateByNameViaApi(testData.templateName).then((template) => {
        if (template) {
          OrderTemplates.deleteOrderTemplateViaApi(template.id);
        }
      });
      Budgets.deleteViaApi(testData.budget.id, false);
      Funds.deleteFundViaApi(testData.fund.id, false);
      Ledgers.deleteLedgerViaApi(testData.ledger.id, false);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C435901 Creation of Order template using restricted by location Fund and appropriate locations (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C435901'] },
      () => {
        // Step 1: On "Order templates" pane, click on "New" button
        OrderTemplates.clickNewOrderTemplateButton();
        OrderTemplateForm.verifyFormButtons({ saveDisabled: true });

        // Step 2: Click on "Expand all" link
        OrderTemplateForm.expandAll();
        OrderTemplateForm.verifyExpandCollapseAllButton({ expanded: true });

        // Step 3: Fill in the "Template name" field with any valid and unique value
        OrderTemplateForm.fillInfoSectionFields({ templateName: testData.templateName });
        OrderTemplateForm.assertInfoSectionFields({ templateName: testData.templateName });
        OrderTemplateForm.verifyFormButtons({ saveDisabled: false });

        // Step 4: In "Fund distribution" accordion, click on "Add fund distribution" button
        OrderTemplateForm.clickAddFundDistributionButton();

        // Step 5: Pick the restricted Fund from "Fund ID" dropdown
        OrderTemplateForm.selectFundDistribution({
          fundName: testData.fund.name,
          fundCode: testData.fund.code,
        });
        OrderTemplateForm.verifyFundDistributionSelected({ fundCode: testData.fund.code });

        // Step 6: On "Location" accordion, click on "Add location" button
        OrderTemplateForm.clickAddLocationButton();

        // Step 7: Click on "Name (code)" dropdown to expand it
        OrderTemplateForm.expandLocationNameCodeDropdown(0);
        // Dropdown contains all locations, not only the one assigned to the restricted fund
        cy.expect([
          OrderTemplateForm.locationOptionExists(testData.restrictedLocation.name),
          OrderTemplateForm.locationOptionExists(testData.otherLocation.name),
        ]);

        // Step 8: Select the Location from precondition #2 from "Name (code)" dropdown
        OrderTemplateForm.selectLocationFromDropdown(testData.restrictedLocation.name);
        OrderTemplateForm.verifyLocationSelected({ location: testData.restrictedLocation.name });

        // Step 9: Click on "Save" button ("The template was saved" toast is checked inside)
        OrderTemplateForm.clickSaveButton();
        InteractorsTools.closeAllVisibleCallouts();
        OrderTemplates.checkTemplateCreated(testData.templateName);

        // Step 10: Click on just created template
        OrderTemplates.selectTemplate(testData.templateName);
        OrderTemplates.checkTemplateViewDetails({ fundDistribution: [testData.fund.name] });
        OrderTemplates.checkFundRestrictionErrorToastAbsent();

        // Step 11: Edit the template, select a different Location and save
        OrderTemplates.openEditForm();
        OrderTemplateForm.clickExpandAllAccordions();
        OrderTemplateForm.expandLocationNameCodeDropdown(0);
        OrderTemplateForm.selectLocationFromDropdown(testData.otherLocation.name);
        OrderTemplateForm.verifyLocationSelected({ location: testData.otherLocation.name });
        OrderTemplateForm.clickSaveButton();
        OrderTemplates.checkTemplateCreated(testData.templateName);

        // Step 12: Click on just edited template
        OrderTemplates.selectTemplate(testData.templateName);
        OrderTemplates.checkTemplateViewDetails({ fundDistribution: [testData.fund.name] });
        OrderTemplates.checkFundRestrictionErrorToastPresent();
      },
    );
  });
});
