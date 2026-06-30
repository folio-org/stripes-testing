import TopMenu from '../../../support/fragments/topMenu';
import InventoryImport from '../../../support/fragments/inventory-import/inventoryImport';

describe('fse-inventory-import - UI (no data manipulation)', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin({
      path: TopMenu.inventoryImportPath,
      waiter: InventoryImport.waitLoading,
    });
    cy.allure().logCommandSteps();
  });

  it(
    `FDOPS-5291 - verify that inventory import module is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'ui', 'inventory-import', 'FDOPS-5291'] },
    () => {
      InventoryImport.verifyJobsLinkDisplayed();
      InventoryImport.verifyFailedRecordsLinkDisplayed();
    },
  );
});
