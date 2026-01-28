import { Permissions } from '../../../../support/dictionary';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      const testData = {
        instanceTitle: `AT_C356821_MarcBibInstance_${getRandomPostfix()}`,
        tag245: '245',
        tag999: '999',
      };
      const updatedTitle = `${testData.instanceTitle} UPD`;
      const createdRecordIDs = [];
      const adminData = {};
      let user;

      before('Creating data', () => {
        cy.getAdminToken();
        cy.getAdminSourceRecord().then((source) => {
          adminData.lastName = source.split(', ')[0];
          adminData.firstName = source.split(', ')[1];
        });
        cy.createTempUser([
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((createdUserProperties) => {
          user = createdUserProperties;
          cy.createSimpleMarcBibViaAPI(testData.instanceTitle).then((instanceId) => {
            createdRecordIDs.push(instanceId);
            cy.waitForAuthRefresh(() => {
              cy.login(user.username, user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            }, 20_000);
          });
        });
      });

      after('Deleting created user and data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteInstanceByTitleViaApi(testData.instanceTitle);
      });

      it(
        'C356821 Verify that "Source" value matched with the user\'s name which had derived "MARC Bibliographic" record. (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C356821'] },
        () => {
          InventoryInstances.searchByTitle(createdRecordIDs[0]);
          InventoryInstances.selectInstanceById(createdRecordIDs[0]);
          InventoryInstance.waitLoading();
          InventoryInstance.verifyLastUpdatedSource(adminData.firstName, adminData.lastName);
          InventoryInstance.deriveNewMarcBib();
          QuickMarcEditor.checkDerivePaneheader();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.updateLDR06And07Positions();
          QuickMarcEditor.updateExistingField(testData.tag245, updatedTitle);

          QuickMarcEditor.addEmptyFields(4);
          QuickMarcEditor.checkEmptyFieldAdded(5);
          QuickMarcEditor.deleteField(5);
          QuickMarcEditor.verifyTagValue(5, testData.tag999);
          QuickMarcEditor.checkFieldsCount(6);

          QuickMarcEditor.pressSaveAndClose();
          InventoryInstance.checkInstanceTitle(updatedTitle);
          InventoryInstance.verifyLastUpdatedSource(user.firstName, user.lastName);
          InventoryInstance.verifyLastUpdatedDate();

          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.checkUserNameInHeader(user.firstName, user.lastName);
        },
      );
    });
  });
});
