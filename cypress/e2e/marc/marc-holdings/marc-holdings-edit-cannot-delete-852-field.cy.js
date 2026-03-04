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
        tag014: '014',
        tag008: '008',
        tag852: '852',
        marcBibTitle: `AT_C375123_MarcBibInstance_${getRandomPostfix()}`,
        tag852Index: 5,
      };

      let recordId;
      let user;

      before('Creating user, data', () => {
        cy.getAdminToken();

        cy.then(() => {
          cy.getLocations({ limit: 1, query: '(name<>"*autotest*" and name<>"AT_*")' }).then(
            (location) => {
              cy.createSimpleMarcBibViaAPI(testData.marcBibTitle).then((instanceId) => {
                recordId = instanceId;
                cy.getInstanceById(instanceId).then((instanceData) => {
                  cy.createSimpleMarcHoldingsViaAPI(
                    instanceData.id,
                    instanceData.hrid,
                    location.code,
                  );
                });
              });
            },
          );
        })
          .then(() => {
            cy.getAdminToken();
            cy.createTempUser([
              Permissions.uiInventoryViewInstances.gui,
              Permissions.uiQuickMarcQuickMarcHoldingsEditorView.gui,
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
        'C375123 User unable to delete "852" field for "MARC holdings" record when editing record (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C375123'] },
        () => {
          InventoryInstances.searchByTitle(recordId);
          InventoryInstances.selectInstanceById(recordId);
          InventoryInstance.waitInstanceRecordViewOpened();
          InventoryInstance.openHoldingView();

          HoldingsRecordView.editInQuickMarc();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.checkFieldsExist([testData.tag852]);
          QuickMarcEditor.checkDeleteButtonExistsByTag(testData.tag852, false);

          cy.wait(1000); // wait for 852 field to be fully loaded to avoid value re-set
          QuickMarcEditor.updateExistingTagValue(testData.tag852Index, testData.tag014);
          QuickMarcEditor.verifyTagValue(testData.tag852Index, testData.tag014);
          QuickMarcEditor.checkDeleteButtonExist(testData.tag852Index, true);
        },
      );
    });
  });
});
