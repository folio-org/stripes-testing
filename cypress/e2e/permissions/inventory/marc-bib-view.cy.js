import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Permissions', () => {
  describe('Permissions --> Inventory', () => {
    const userData = {};
    let instanceID;
    const marcFile = 'oneMarcBib.mrc';
    const fileName = `autotest1Bib${getRandomPostfix()}.mrc`;
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;
    const propertyName = 'instance';

    before('Creating user', () => {
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
          response.forEach((record) => {
            instanceID = record[propertyName].id;
          });
        });
      });
    });

    after('Deleting created user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(userData.id);

      InventoryInstance.deleteInstanceViaApi(instanceID);
    });

    it(
      'C350967 quickMARC: View MARC bibliographic record (spitfire)',
      { tags: ['smoke', 'spitfire', 'C350967'] },
      () => {
        cy.waitForAuthRefresh(() => {
          cy.login(userData.name, userData.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        }, 20_000);
        InventorySearchAndFilter.verifyPanesExist();
        InventorySearchAndFilter.instanceTabIsDefault();
        InventoryInstances.searchByTitle(instanceID);
        InventoryInstance.waitInstanceRecordViewOpened();
        InventoryInstance.checkExpectedMARCSource();
        // Wait for the content to be loaded.
        cy.wait(2000);
        InventoryInstance.checkMARCSourceAtNewPane();
      },
    );
  });
});
