import { randomFourDigitNumber } from '../../support/utils/stringTools';
import { DevTeams, Permissions, TestTypes } from '../../support/dictionary';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Edit Authority record', () => {
  const testData = {};

  before('Create test data', () => {
    /*
        *Authorized user with the following permissions:
  MARC Authority: Edit MARC authority record
  MARC Authority: View MARC authority record
  quickMARC: View, edit MARC authorities record
  *The system must contain valid MARC Authority records.
  *Marc Authority app is running.
  reference: https://www.loc.gov/marc/authority/ad008.html
    */

    cy.getAdminToken().then(() => {
      // create all test objects
    });

    cy.createTempUser([
      // specify all permissions mentioned in test preconditions
      // Permissions.uiTenantSettingsSettingsLocation.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.inventoryPath,
      });
    });
  });

  after('Delete test data', () => {
    /* delete all test objects created in precondition if possible */
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C350691 Update 008 field of MARC Authority record (spitfire) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.spitfire] },
    () => {
      // #1 Fill in the input field with a search query and click the "Search" button.
      // Search completed and results list meets user expectations.
      // #2 Click on some title at result list to open detail view pane.
      // Detail view of MARC Authority record opened at third pane.
      // #3 Click on the "Action" button and choose "Edit".
      // The MARC record editing window is open.
      // #4 Change any position at 008 field for valid value and click on the "Save" button.
      // [See reference at precondition]
      // The success saving toast notification with the message "This record has successfully saved and is in process. Changes may not appear immediately." is displayed.
      // Detail view of "MARC Authority" record opened at third pane.
      // #5 Verify that the changes made are displayed in field 008.
      // The changes are displayed.
    },
  );
});
