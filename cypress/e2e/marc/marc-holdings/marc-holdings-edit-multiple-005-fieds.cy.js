import Permissions from '../../../support/dictionary/permissions';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import DateTools from '../../../support/utils/dateTools';
import { including } from '../../../../interactors';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    describe('Edit MARC holdings', () => {
      const testData = {
        tag005: '005',
        marcBibTitle: `AT_C496218_MarcBibInstance_${getRandomPostfix()}`,
        tag005Index: 2,
        secondTag005Index: 5,
        secondTag005Content: 'tag005',
        temporaryTag: '100',
      };

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
                cy.createSimpleMarcHoldingsViaAPI(
                  instanceData.id,
                  instanceData.hrid,
                  location.code,
                );
              });
            });
          });
        })
          .then(() => {
            cy.getAdminToken();
            cy.createTempUser([
              Permissions.uiInventoryViewInstances.gui,
              Permissions.uiInventoryViewCreateEditHoldings.gui,
              Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
            ]).then((userProperties) => {
              user = userProperties;
            });
          })
          .then(() => {
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
      });

      after('Deleting created user, data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteFullInstancesByTitleViaApi(testData.marcBibTitle);
      });

      it(
        'C496218 Add multiple 005s when editing "MARC Holdings" record (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C496218'] },
        () => {
          InventoryInstances.searchByTitle(recordId);
          InventoryInstances.selectInstanceById(recordId);
          InventoryInstance.waitInstanceRecordViewOpened();
          InventoryInstance.openHoldingView();
          HoldingsRecordView.editInQuickMarc();
          QuickMarcEditor.waitLoading();

          QuickMarcEditor.addEmptyFields(testData.secondTag005Index - 1);
          QuickMarcEditor.checkEmptyFieldAdded(testData.secondTag005Index);

          QuickMarcEditor.updateExistingField('', testData.secondTag005Content);
          QuickMarcEditor.updateTagNameToLockedTag(testData.secondTag005Index, testData.tag005);
          QuickMarcEditor.checkFourthBoxEditable(testData.secondTag005Index, false);
          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.verifyNumOfFieldsWithTag(testData.tag005, 2);

          cy.wait(1000);
          QuickMarcEditor.deleteTag(testData.tag005Index);
          QuickMarcEditor.deleteTag(testData.secondTag005Index);
          QuickMarcEditor.checkFieldAbsense(testData.tag005);

          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.confirmDelete();
          QuickMarcEditor.checkNoDeletePlaceholder();
          QuickMarcEditor.verifyNoDuplicatedFieldsWithTag(testData.tag005);
          QuickMarcEditor.checkContentByTag(
            testData.tag005,
            including(DateTools.getCurrentDateYYMMDD()),
          );
        },
      );
    });
  });
});
