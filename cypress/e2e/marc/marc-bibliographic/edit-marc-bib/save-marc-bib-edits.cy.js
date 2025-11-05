import { Permissions } from '../../../../support/dictionary';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const testData = {
        instanceTitle: `AT_C350628_MarcBibInstance_${getRandomPostfix()}`,
        tag245: '245',
        valid245IndicatorValue: '1',
      };
      const createdRecordIDs = [];
      let user;

      before('Creating data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.inventoryAll.gui,
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
              cy.reload();
              InventoryInstances.waitContentLoading();
            }, 20_000);
          });
        });
      });

      after('Deleting user, data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        createdRecordIDs.forEach((recordId) => {
          InventoryInstance.deleteInstanceViaApi(recordId);
        });
      });

      it(
        'C350628 Verify saving quickMARC edits (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C350628'] },
        () => {
          InventoryInstances.searchByTitle(createdRecordIDs[0]);
          InventoryInstances.selectInstanceById(createdRecordIDs[0]);
          InventoryInstance.waitLoading();
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.updateLDR06And07Positions();
          QuickMarcEditor.updateIndicatorValue(testData.tag245, testData.valid245IndicatorValue, 0);
          QuickMarcEditor.updateIndicatorValue(testData.tag245, testData.valid245IndicatorValue, 1);
          QuickMarcEditor.updateExistingField(testData.tag245, `$a ${testData.instanceTitle} UPD`);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();
          InventoryInstance.verifyInstanceTitle(`${testData.instanceTitle} UPD`);
        },
      );
    });
  });
});
