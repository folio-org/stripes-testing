import Permissions from '../../../support/dictionary/permissions';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    describe('Edit MARC holdings', () => {
      const testData = {
        tag004: '004',
        tag008: '008',
        tag014: '014',
        tag852: '852',
        tag866: '866',
        tag868: '868',
        marcBibTitle: `AT_C359178_MarcBibInstance_${getRandomPostfix()}`,
        tag014Value: 'Field014',
        tag866Value: 'Field866',
        tag868Value: 'Field868',
      };
      const fieldsToDelete = [testData.tag014, testData.tag866, testData.tag868];
      const fieldsToDeleteIndexes = [5, 7, 8];

      let recordId;
      let user;

      before('Creating user, data', () => {
        cy.getAdminToken();

        cy.then(() => {
          cy.getLocations({
            limit: 1,
            query: '(name<>"*autotest*" and name<>"AT_*" and name<>"*auto*")',
          }).then((location) => {
            cy.createSimpleMarcBibViaAPI(testData.marcBibTitle).then((instanceId) => {
              recordId = instanceId;
              cy.getInstanceById(instanceId).then((instanceData) => {
                cy.createMarcHoldingsViaAPI(instanceData.id, [
                  {
                    content: instanceData.hrid,
                    tag: testData.tag004,
                  },
                  {
                    content: QuickMarcEditor.defaultValid008HoldingsValues,
                    tag: testData.tag008,
                  },
                  {
                    content: `$a ${testData.tag014Value}`,
                    indicators: ['\\', '\\'],
                    tag: testData.tag014,
                  },
                  {
                    content: `$b ${location.code}`,
                    indicators: ['\\', '\\'],
                    tag: testData.tag852,
                  },
                  {
                    content: `$a ${testData.tag866Value}`,
                    indicators: ['\\', '\\'],
                    tag: testData.tag866,
                  },
                  {
                    content: `$a ${testData.tag868Value}`,
                    indicators: ['\\', '\\'],
                    tag: testData.tag868,
                  },
                ]);
              });
            });
          });
        })
          .then(() => {
            cy.getAdminToken();
            cy.createTempUser([
              Permissions.inventoryAll.gui,
              Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
            ]).then((userProperties) => {
              user = userProperties;
            });
          })
          .then(() => {
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });
          });
      });

      after('Deleting created user, data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteFullInstancesByTitleViaApi(testData.marcBibTitle);
      });

      it(
        'C359178 MARC Holdings | Verify that deleted MARC Field will display at the same position after restoring (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C359178'] },
        () => {
          InventoryInstances.searchByTitle(recordId);
          InventoryInstances.selectInstanceById(recordId);
          InventoryInstance.waitInstanceRecordViewOpened();
          InventoryInstance.openHoldingView();

          HoldingsRecordView.editInQuickMarc();
          QuickMarcEditor.waitLoading();

          fieldsToDelete.forEach((tag) => {
            QuickMarcEditor.deleteFieldByTagAndCheck(tag);
            QuickMarcEditor.afterDeleteNotification(tag);
          });

          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkDeleteModal(fieldsToDelete.length);

          QuickMarcEditor.clickRestoreDeletedField();
          fieldsToDelete.forEach((field, index) => {
            QuickMarcEditor.verifyTagValue(fieldsToDeleteIndexes[index], field);
          });
        },
      );
    });
  });
});
