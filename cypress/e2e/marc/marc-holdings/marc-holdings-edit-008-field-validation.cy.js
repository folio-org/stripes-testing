import Permissions from '../../../support/dictionary/permissions';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import DataImport from '../../../support/fragments/data_import/dataImport';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import InventorySteps from '../../../support/fragments/inventory/inventorySteps';
import DateTools from '../../../support/utils/dateTools';
import FileManager from '../../../support/utils/fileManager';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    describe('Edit MARC holdings', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        tag008: '008',
        tag852: '852',
        marcBibTitle: `AT_C387454_MarcBibInstance_${randomPostfix}`,
        tag008RowIndex: 4,
        holdingsHridPlaceholder: 'in00000000000',
        holdingsLocationPlaceholder: 'LOCCODE',
        editedHoldingsFileName: `editedHoldingsFileC387454.${randomPostfix}.mrc`,
        tag852NewSubfield: '$h test',
        expected008BoxesSets: [
          'AcqStatus',
          'AcqMethod',
          'Gen ret',
          'Compl',
          'Lend',
          'Repro',
          'Lang',
          'Sep/comp',
          'Rept date',
        ],
      };
      const holdingsFile = {
        marc: 'marcHoldingsFileC387454.mrc',
        fileName: `testMarcFile.C387454.${randomPostfix}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_HOLDINGS_AND_SRS,
      };

      let recordId;
      let user;
      let location;
      let holdingsId;

      before('Creating user, data', () => {
        cy.getAdminToken();

        cy.then(() => {
          cy.getLocations({ limit: 1, query: '(name<>"*autotest*" and name<>"AT_*")' }).then(
            (loc) => {
              location = loc;
              cy.createSimpleMarcBibViaAPI(testData.marcBibTitle).then((instanceId) => {
                recordId = instanceId;
                cy.getInstanceById(instanceId).then((instanceData) => {
                  DataImport.editMarcFile(
                    holdingsFile.marc,
                    testData.editedHoldingsFileName,
                    [testData.holdingsHridPlaceholder, testData.holdingsLocationPlaceholder],
                    [instanceData.hrid, location.code],
                  );
                });
              });
            },
          );
        })
          .then(() => {
            DataImport.uploadFileViaApi(
              testData.editedHoldingsFileName,
              holdingsFile.fileName,
              holdingsFile.jobProfileToRun,
            ).then((response) => {
              holdingsId = response[0].holding.id;
            });
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
            });
          });
      });

      after('Deleting created user, data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteFullInstancesByTitleViaApi(testData.marcBibTitle);
        FileManager.deleteFile(`cypress/fixtures/${testData.editedHoldingsFileName}`);
      });

      it(
        'C387454 "008" field existence validation when edit imported "MARC Holdings" (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C387454'] },
        () => {
          InventoryInstances.searchByTitle(recordId);
          InventoryInstances.selectInstanceById(recordId);
          InventoryInstance.waitInstanceRecordViewOpened();
          InventoryInstance.openHoldingView();

          HoldingsRecordView.editInQuickMarc();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.checkTagAbsent(testData.tag008);

          QuickMarcEditor.pressCancel();
          HoldingsRecordView.waitLoading();

          HoldingsRecordView.editInQuickMarc();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.checkTagAbsent(testData.tag008);

          cy.wait(1000); // wait for 852 field to be fully loaded to avoid value reset
          QuickMarcEditor.updateExistingField(
            testData.tag852,
            `$b ${location.code} ${testData.tag852NewSubfield}`,
          );
          QuickMarcEditor.checkContentByTag(
            testData.tag852,
            `$b ${location.code} ${testData.tag852NewSubfield}`,
          );
          QuickMarcEditor.checkButtonsEnabled();

          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.verifyValidationCallout(0, 1);
          QuickMarcEditor.checkDelete008Callout();
          QuickMarcEditor.closeAllCallouts();

          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.verifyValidationCallout(0, 1);
          QuickMarcEditor.checkDelete008Callout();
          QuickMarcEditor.closeAllCallouts();

          QuickMarcEditor.addNewField(testData.tag008, '', testData.tag008RowIndex - 1);
          QuickMarcEditor.checkSubfieldsPresenceInTag008();
          QuickMarcEditor.checkOnlyBackslashesIn008BoxesHoldings();

          QuickMarcEditor.updateExistingTagValue(
            testData.tag008RowIndex,
            testData.tag008.slice(0, -1),
          );
          QuickMarcEditor.verifyTagField(
            testData.tag008RowIndex,
            testData.tag008.slice(0, -1),
            '\\',
            '\\',
            '',
            '',
          );

          QuickMarcEditor.updateExistingTagValue(testData.tag008RowIndex, testData.tag008);
          QuickMarcEditor.checkSubfieldsPresenceInTag008();
          QuickMarcEditor.checkOnlyBackslashesIn008BoxesHoldings();

          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.checkOnlyBackslashesIn008BoxesHoldings();
          QuickMarcEditor.checkContentByTag(
            testData.tag852,
            `$b ${location.code} ${testData.tag852NewSubfield}`,
          );

          cy.wait(1000); // wait for 008 field to be fully saved to avoid value reset
          QuickMarcEditor.clearCertain008Boxes(...testData.expected008BoxesSets);
          testData.expected008BoxesSets.forEach((boxName) => {
            QuickMarcEditor.verify008TextFields(boxName, '');
          });

          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.checkOnlyBackslashesIn008BoxesHoldings();

          cy.wait(1000); // wait for 008 field to be fully loaded to avoid value reset
          QuickMarcEditor.clearCertain008Boxes(...testData.expected008BoxesSets);
          testData.expected008BoxesSets.forEach((boxName) => {
            QuickMarcEditor.verify008TextFields(boxName, '');
          });
          QuickMarcEditor.pressSaveAndCloseButton();
          HoldingsRecordView.waitLoading();

          HoldingsRecordView.editInQuickMarc();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.checkOnlyBackslashesIn008BoxesHoldings();
          InventorySteps.verifyHiddenFieldValueIn008(
            holdingsId,
            'Date Ent',
            DateTools.getCurrentDateYYMMDD(),
          );
        },
      );
    });
  });
});
