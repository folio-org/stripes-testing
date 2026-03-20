import Permissions from '../../../support/dictionary/permissions';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import { DEFAULT_JOB_PROFILE_NAMES, HOLDINGS_SOURCE_NAMES } from '../../../support/constants';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import FileManager from '../../../support/utils/fileManager';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    describe('Edit MARC holdings', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        tag347: '347',
        tag361: '361',
        tag506: '506',
        tag538: '538',
        tag541: '541',
        tag561: '561',
        tag562: '562',
        tag563: '563',
        tag841: '841',
        tag842: '842',
        tag843: '843',
        tag844: '844',
        tag852: '852',
        marcBibTitle: `AT_C350698_MarcBibInstance_${randomPostfix}`,
        tag852Index: 5,
      };
      const marcFile = {
        marc: 'marcHoldingsFileForC350698.mrc',
        editedFileName: `updatedMarcHoldingsC350698_${randomPostfix}.mrc`,
        fileName: `testMarcHoldingsC350698_${randomPostfix}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_HOLDINGS_AND_SRS,
      };
      const addedFieldsData = [
        { rowIndex: testData.tag852Index + 1, tag: testData.tag541, content: '$a Added Field541' },
        { rowIndex: testData.tag852Index + 2, tag: testData.tag561, content: '$a Added Field561' },
        { rowIndex: testData.tag852Index + 3, tag: testData.tag562, content: '$a Added Field562' },
        { rowIndex: testData.tag852Index + 4, tag: testData.tag563, content: '$a Added Field563' },
      ];
      const deletedFieldsTags = [
        testData.tag347,
        testData.tag361,
        testData.tag506,
        testData.tag538,
      ];
      const updatedFieldsData = [
        { tag: testData.tag841, content: '$a Updated Field841' },
        { tag: testData.tag842, content: '$a Updated Field842' },
        { tag: testData.tag843, content: '$a Updated Field843' },
        { tag: testData.tag844, content: '$a Updated Field844' },
      ];

      let recordId;
      let user;
      let instanceHrid;

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
                instanceHrid = instanceData.hrid;

                // edit marc file adding instance hrid
                DataImport.editMarcFile(
                  marcFile.marc,
                  marcFile.editedFileName,
                  ['in00000000000', 'LCODE'],
                  [instanceHrid, location.code],
                );
              });
            });
          });
        })
          .then(() => {
            DataImport.uploadFileViaApi(
              marcFile.editedFileName,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            );
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
            });
          });
      });

      after('Deleting created user, data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteFullInstancesByTitleViaApi(testData.marcBibTitle);
        FileManager.deleteFile(`cypress/fixtures/${marcFile.editedFileName}`);
      });

      it(
        'C350698 Edit the imported MARC holdings record via quickmarc multiple times (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C350698'] },
        () => {
          InventoryInstances.searchByTitle(recordId);
          InventoryInstances.selectInstanceById(recordId);
          InventoryInstance.waitInstanceRecordViewOpened();
          InventoryInstance.openHoldingView();
          HoldingsRecordView.checkSource(HOLDINGS_SOURCE_NAMES.MARC);

          addedFieldsData.forEach((addedField, index) => {
            HoldingsRecordView.editInQuickMarc();
            QuickMarcEditor.waitLoading();

            QuickMarcEditor.addNewField(
              addedField.tag,
              addedField.content,
              addedField.rowIndex - 1,
            );
            QuickMarcEditor.checkContentByTag(addedField.tag, addedField.content);

            cy.wait(1000);
            QuickMarcEditor.deleteFieldByTagAndCheck(deletedFieldsTags[index]);
            QuickMarcEditor.afterDeleteNotification(deletedFieldsTags[index]);

            QuickMarcEditor.updateExistingField(
              updatedFieldsData[index].tag,
              updatedFieldsData[index].content,
            );
            QuickMarcEditor.checkContentByTag(
              updatedFieldsData[index].tag,
              updatedFieldsData[index].content,
            );

            QuickMarcEditor.pressSaveAndClose({ acceptDeleteModal: true });
            QuickMarcEditor.checkAfterSaveHoldings();
            HoldingsRecordView.waitLoading();

            HoldingsRecordView.viewSource();
            InventoryViewSource.checkRowExistsWithTagAndValue(addedField.tag, addedField.content);
            InventoryViewSource.checkRowExistsWithTagAndValue(
              updatedFieldsData[index].tag,
              updatedFieldsData[index].content,
            );
            InventoryViewSource.notContains(`${deletedFieldsTags[index]}\t`);
          });

          InventoryViewSource.checkRowExistsWithTagAndValue(
            addedFieldsData[0].tag,
            addedFieldsData[0].content,
          );
          InventoryViewSource.checkRowExistsWithTagAndValue(
            addedFieldsData[1].tag,
            addedFieldsData[1].content,
          );
          InventoryViewSource.checkRowExistsWithTagAndValue(
            addedFieldsData[2].tag,
            addedFieldsData[2].content,
          );
          InventoryViewSource.checkRowExistsWithTagAndValue(
            updatedFieldsData[0].tag,
            updatedFieldsData[0].content,
          );
          InventoryViewSource.checkRowExistsWithTagAndValue(
            updatedFieldsData[1].tag,
            updatedFieldsData[1].content,
          );
          InventoryViewSource.checkRowExistsWithTagAndValue(
            updatedFieldsData[2].tag,
            updatedFieldsData[2].content,
          );
          InventoryViewSource.notContains(`${deletedFieldsTags[0]}\t`);
          InventoryViewSource.notContains(`${deletedFieldsTags[1]}\t`);
          InventoryViewSource.notContains(`${deletedFieldsTags[2]}\t`);
        },
      );
    });
  });
});
