import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import TitleLevelRequests from '../../../support/fragments/settings/circulation/titleLevelRequests';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Permissions', () => {
  describe('Permissions --> Inventory', () => {
    const userData = {};
    let instanceID;
    const marcFile = 'oneMarcBib.mrc';
    const fileName = `autotest1Bib${getRandomPostfix()}.mrc`;
    const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
    const propertyName = 'relatedInstanceInfo';

    before('Creating user', () => {
      // This step added because when it runs checkbox "Allow title level requests" in settings/circulation/title-level-requests
      // checked. For the test case it should be unchecked.
      cy.getAdminToken().then(() => {
        TitleLevelRequests.disableTLRViaApi();
      });
      cy.createTempUser([
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
        Permissions.inventoryAll.gui,
      ]).then((createdUserProperties) => {
        userData.id = createdUserProperties.userId;
        userData.firstName = createdUserProperties.firstName;
        userData.name = createdUserProperties.username;
        userData.password = createdUserProperties.password;

        cy.getAdminToken();
        DataImport.uploadFileViaApi(marcFile, fileName, jobProfileToRun).then((response) => {
          response.entries.forEach((record) => {
            instanceID = record[propertyName].idList[0];
          });
        });
      });
    });

    after('Deleting created user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(userData.id);

      InventoryInstance.deleteInstanceViaApi(instanceID);
      // This step returns checkbox "Allow title level requests" in settings/circulation/title-level-requests
      // to the state it was before this test.
      TitleLevelRequests.enableTLRViaApi();
    });

    it(
      'C350967 quickMARC: View MARC bibliographic record (spitfire)',
      { tags: ['smoke', 'spitfire', 'eurekaPhase1'] },
      () => {
        cy.login(userData.name, userData.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventoryInstances.searchBySource('MARC');
        InventoryInstances.searchByTitle(instanceID);
        InventoryInstance.checkExpectedMARCSource();
        // Wait for the content to be loaded.
        cy.wait(2000);
        InventoryInstance.checkMARCSourceAtNewPane();
      },
    );
  });
});
