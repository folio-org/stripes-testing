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
    describe('Edit MARC Holdings', () => {
      const testData = {
        tag852: '852',
        marcBibTitle: `AT_C503109_MarcBibInstance_${getRandomPostfix()}`,
      };
      const multiple852ErrorText = 'Fail: Record cannot be saved. Can only have one MARC 852.';

      let recordId;
      let secondLocationCode;

      before('Creating user, data', () => {
        cy.getAdminToken();
        cy.then(() => {
          cy.getLocations({ limit: 2, query: '(name<>"*autotest*" and name<>"AT_*")' }).then(
            (location) => {
              // create MARC instance with Holding and without Items
              cy.createSimpleMarcBibViaAPI(testData.marcBibTitle).then((instanceId) => {
                recordId = instanceId;
                cy.getInstanceById(instanceId).then((instanceData) => {
                  recordId = instanceData.id;
                  secondLocationCode = Cypress.env('locations')[1].code;
                  cy.createSimpleMarcHoldingsViaAPI(
                    instanceData.id,
                    instanceData.hrid,
                    location.code,
                  );
                });
              });
            },
          );
        }).then(() => {
          cy.getAdminToken();
          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcHoldingsEditorCreate.gui,
            Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
          ]).then((tempUser) => {
            testData.tempUser = tempUser;

            cy.login(tempUser.username, tempUser.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });
      });

      after('Deleting created user, data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.tempUser.userId);
        InventoryInstances.deleteFullInstancesByTitleViaApi(testData.marcBibTitle);
      });

      it(
        'C503109 Add multiple 852s when editing "MARC Holdings" record (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C503109'] },
        () => {
          InventoryInstances.searchByTitle(recordId);
          InventoryInstances.selectInstanceById(recordId);
          InventoryInstance.waitLoading();
          InventoryInstance.openHoldingView();
          HoldingsRecordView.editInQuickMarc();
          // Add a new field (row)
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.addEmptyFields(5);
          QuickMarcEditor.checkEmptyFieldAdded(6);
          // Set the tag to 852 and add location code
          QuickMarcEditor.updateExistingTagValue(6, testData.tag852);
          QuickMarcEditor.updateExistingFieldContent(6, `$b ${secondLocationCode}`);
          // Attempt to save
          QuickMarcEditor.pressSaveAndCloseButton();
          // Assert inline error and toast
          QuickMarcEditor.checkErrorMessageForField(5, multiple852ErrorText);
          QuickMarcEditor.checkErrorMessageForField(6, multiple852ErrorText);
          QuickMarcEditor.verifyValidationCallout(0, 2);
        },
      );
    });
  });
});
