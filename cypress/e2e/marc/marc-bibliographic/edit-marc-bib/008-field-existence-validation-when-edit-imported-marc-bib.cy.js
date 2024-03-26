import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySteps from '../../../../support/fragments/inventory/inventorySteps';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import DateTools from '../../../../support/utils/dateTools';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const testData = {
        createdRecordIDs: [],
        tag245: '245',
        tag245content:
          '$aWicked :$bthe life and times of the wicked witch of the West : a novel /$cGregory Maguire ; illustrations by Douglas Smith. TEST',
        tag245RowIndex: 12,
        tag008: '008',
        tag008RowIndex: 3,
        tag00: '00',
        expected008BoxesSets: [
          'DtSt',
          'Date 1',
          'Date 2',
          'Ctry',
          'Ills',
          'Audn',
          'Form',
          'Cont',
          'GPub',
          'Conf',
          'Fest',
          'Indx',
          'LitF',
          'Biog',
          'Lang',
          'MRec',
          'Srce',
        ],
        tag008BoxValues: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        calloutMessage:
          'This record has successfully saved and is in process. Changes may not appear immediately.',
        errorCalloutMessage: 'Record cannot be saved without 008 field',
        initial008EnteredValue: DateTools.getCurrentDateYYMMDD(),
      };
      const marcFile = {
        marc: 'marcBibFileForC387451.mrc',
        fileName: `testMarcFile${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        numOfRecords: 1,
        propertyName: 'instance',
      };

      before('Creating user and data', () => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.moduleDataImportEnabled.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.getAdminToken();
          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              testData.createdRecordIDs.push(record[marcFile.propertyName].id);
            });
          });

          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });

      after('Deleting created user and data', () => {
        cy.getAdminToken().then(() => {
          Users.deleteViaApi(testData.userProperties.userId);
          InventoryInstance.deleteInstanceViaApi(testData.createdRecordIDs[0]);
        });
      });

      it(
        'C387451 "008" field existence validation when edit imported "MARC bib" (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire'] },
        () => {
          InventoryInstances.waitContentLoading();
          InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.checkEditableQuickMarcFormIsOpened();
          QuickMarcEditor.updateExistingFieldContent(
            testData.tag245RowIndex,
            testData.tag245content,
          );
          QuickMarcEditor.checkButtonsEnabled();
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkCallout(testData.errorCalloutMessage);
          QuickMarcEditor.closeCallout();
          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkCallout(testData.errorCalloutMessage);
          QuickMarcEditor.closeCallout();
          QuickMarcEditor.addNewField(testData.tag008, '', testData.tag008RowIndex);
          QuickMarcEditor.check008FieldLabels(testData.expected008BoxesSets);
          QuickMarcEditor.updateExistingTagValue(4, testData.tag00);
          QuickMarcEditor.verifyTagValue(4, testData.tag00);
          QuickMarcEditor.checkContent('', 4);
          QuickMarcEditor.checkDeleteButtonExist(4);
          QuickMarcEditor.updateExistingTagValue(4, testData.tag008);
          QuickMarcEditor.pressSaveAndKeepEditing(testData.calloutMessage);
          QuickMarcEditor.checkEditableQuickMarcFormIsOpened();
          QuickMarcEditor.check008FieldContent();
          QuickMarcEditor.updateValuesIn008Boxes(testData.tag008BoxValues);
          QuickMarcEditor.pressSaveAndClose();
          cy.intercept(`/inventory/instances/${testData.createdRecordIDs[0]}`).as('recordUpdated');
          QuickMarcEditor.checkAfterSaveAndClose();
          cy.wait('@recordUpdated').then(() => {
            InventoryInstance.editMarcBibliographicRecord();
            InventorySteps.verifyHiddenFieldValueIn008(
              testData.createdRecordIDs[0],
              'Entered',
              testData.initial008EnteredValue,
            );
          });
        },
      );
    });
  });
});
