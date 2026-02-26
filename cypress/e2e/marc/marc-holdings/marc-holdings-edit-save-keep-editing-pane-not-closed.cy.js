import Permissions from '../../../support/dictionary/permissions';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    describe('Edit MARC holdings', () => {
      const testData = {
        tag004: '004',
        tag008: '008',
        tag852: '852',
        tag866: '866',
        tag867: '867',
        tag868: '868',
        marcBibTitle: `AT_C360100_MarcBibInstance_${getRandomPostfix()}`,
        tag866Value: 'Field866',
        tag867Value: 'Field867',
        tag868Value: 'Field868',
      };

      let recordId;
      let user;
      let adminUser;
      const locations = [];

      before('Creating user, data', () => {
        cy.getAdminToken();
        cy.getAdminSourceRecord().then((record) => {
          adminUser = record;
        });

        cy.then(() => {
          cy.getLocations({
            limit: 2,
            query: '(name<>"*autotest*" and name<>"AT_*" and name<>"*auto*")',
          }).then(() => {
            locations.push(...Cypress.env('locations'));
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
                    content: `$b ${locations[0].code}`,
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
        'C360100 Verify that click on the "Save & keep editing" button doesn\'t close the editing window of "MARC Holdings" record (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C360100'] },
        () => {
          InventoryInstances.searchByTitle(recordId);
          InventoryInstances.selectInstanceById(recordId);
          InventoryInstance.waitInstanceRecordViewOpened();
          InventoryInstance.openHoldingView();

          HoldingsRecordView.editInQuickMarc();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.checkButtonsDisabled();
          QuickMarcEditor.checkMarcHoldingsEditHeader({ user: adminUser });

          QuickMarcEditor.updateExistingField(testData.tag852, `$b ${locations[1].code}`);
          QuickMarcEditor.checkContentByTag(testData.tag852, `$b ${locations[1].code}`);
          QuickMarcEditor.checkButtonsEnabled();

          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.checkAfterSaveAndKeepEditing();
          QuickMarcEditor.closeAllCallouts();
          QuickMarcEditor.checkButtonsDisabled();
          QuickMarcEditor.checkMarcHoldingsEditHeader({
            user: `${user.lastName}, ${user.firstName}`,
          });
          QuickMarcEditor.checkButtonsDisabled();

          QuickMarcEditor.addEmptyFields(7);
          QuickMarcEditor.checkEmptyFieldAdded(8);
          QuickMarcEditor.checkButtonsEnabled();

          QuickMarcEditor.addValuesToExistingField(
            7,
            testData.tag867,
            `$a ${testData.tag867Value}`,
          );
          QuickMarcEditor.verifyTagValue(8, testData.tag867);
          QuickMarcEditor.checkContentByTag(testData.tag867, `$a ${testData.tag867Value}`);

          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.checkAfterSaveAndKeepEditing();
          QuickMarcEditor.closeAllCallouts();
          QuickMarcEditor.checkButtonsDisabled();
          QuickMarcEditor.checkMarcHoldingsEditHeader({
            user: `${user.lastName}, ${user.firstName}`,
          });

          cy.wait(4000);
          QuickMarcEditor.deleteFieldByTagAndCheck(testData.tag867);
          QuickMarcEditor.afterDeleteNotification(testData.tag867);
          QuickMarcEditor.checkButtonsEnabled();

          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkDeleteModal(1);
          QuickMarcEditor.confirmDelete();
          QuickMarcEditor.closeAllCallouts();
          QuickMarcEditor.checkFieldAbsense(testData.tag867);
          QuickMarcEditor.checkNoDeletePlaceholder();
          QuickMarcEditor.checkButtonsDisabled();
          QuickMarcEditor.checkMarcHoldingsEditHeader({
            user: `${user.lastName}, ${user.firstName}`,
          });

          QuickMarcEditor.deleteFieldByTagAndCheck(testData.tag866);
          QuickMarcEditor.afterDeleteNotification(testData.tag866);
          QuickMarcEditor.checkButtonsEnabled();

          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkDeleteModal(1);
          QuickMarcEditor.clickRestoreDeletedField();
          QuickMarcEditor.checkNoDeletePlaceholder();
          QuickMarcEditor.checkContentByTag(testData.tag866, `$a ${testData.tag866Value}`);
          QuickMarcEditor.checkButtonsDisabled();

          QuickMarcEditor.moveFieldUp(7);
          QuickMarcEditor.verifyTagValue(6, testData.tag868);
          QuickMarcEditor.verifyTagValue(7, testData.tag866);
          QuickMarcEditor.checkButtonsEnabled();

          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.checkAfterSaveAndKeepEditing();
          QuickMarcEditor.closeAllCallouts();
          QuickMarcEditor.checkButtonsDisabled();
          QuickMarcEditor.checkMarcHoldingsEditHeader({
            user: `${user.lastName}, ${user.firstName}`,
          });

          QuickMarcEditor.pressCancel();
          HoldingsRecordView.waitLoading();
          HoldingsRecordView.checkEffectiveLocation(locations[1].name);

          HoldingsRecordView.viewSource();
          InventoryViewSource.checkRowExistsWithTagAndValue(
            testData.tag852,
            `$b ${locations[1].code}`,
          );
          InventoryViewSource.verifyExistanceOfValueInRow(testData.tag868, 6);
          InventoryViewSource.verifyExistanceOfValueInRow(testData.tag866, 7);
          InventoryViewSource.notContains(`\t${testData.tag867}\t`);
        },
      );
    });
  });
});
