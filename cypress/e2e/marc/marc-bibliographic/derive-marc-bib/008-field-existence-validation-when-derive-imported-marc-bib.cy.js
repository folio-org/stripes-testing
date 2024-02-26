import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventorySteps from '../../../../support/fragments/inventory/inventorySteps';
import DateTools from '../../../../support/utils/dateTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      const testData = {
        createdRecordIDs: [],
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
        calloutMessage: 'Creating record may take several seconds.',
        errorCalloutMessage: 'Record cannot be saved without 008 field',
        initial008EnteredValue: DateTools.getCurrentDateYYMMDD(),
      };
      const marcFile = {
        marc: 'marcBibFileForC387452.mrc',
        fileName: `C387452 testMarcFile${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
        numOfRecords: 1,
        propertyName: 'relatedInstanceInfo',
      };

      before('Creating user and data', () => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
          Permissions.moduleDataImportEnabled.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(
            () => {
              DataImport.uploadFileViaApi(
                marcFile.marc,
                marcFile.fileName,
                marcFile.jobProfileToRun,
              ).then((response) => {
                response.entries.forEach((record) => {
                  testData.createdRecordIDs.push(record[marcFile.propertyName].idList[0]);
                });
              });
            },
          );

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
        'C387452 "008" field existence validation when derive imported "MARC bib" (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire'] },
        () => {
          cy.visit(`${TopMenu.inventoryPath}/view/${testData.createdRecordIDs[0]}`);
          InventoryInstance.deriveNewMarcBib();
          QuickMarcEditor.checkFieldAbsense(testData.tag008);
          QuickMarcEditor.pressCancel();
          InventoryInstance.waitInventoryLoading();

          InventoryInstance.deriveNewMarcBibRecord();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.updateExistingField('245', `Derived_C387452_${getRandomPostfix()}`);
          QuickMarcEditor.checkFieldAbsense(testData.tag008);
          QuickMarcEditor.checkButtonSaveAndCloseEnable();
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkCallout(testData.errorCalloutMessage);
          QuickMarcEditor.closeCallout();
          QuickMarcEditor.addNewField(testData.tag008, '', testData.tag008RowIndex);
          QuickMarcEditor.check008FieldLabels(testData.expected008BoxesSets);
          QuickMarcEditor.updateExistingTagValue(4, testData.tag00);
          QuickMarcEditor.verifyTagValue(4, testData.tag00);
          QuickMarcEditor.checkContent('', 4);
          QuickMarcEditor.checkDeleteButtonExist(4);
          QuickMarcEditor.updateExistingTagValue(4, testData.tag008);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndCloseDerive();
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.checkSubfieldsPresenceInTag008();
          QuickMarcEditor.saveInstanceIdToArrayInQuickMarc(testData.createdRecordIDs).then(() => {
            cy.getAdminToken();
            InventorySteps.verifyHiddenFieldValueIn008(
              testData.createdRecordIDs[1],
              'Entered',
              DateTools.getCurrentDateYYMMDD(),
            );
          });
        },
      );
    });
  });
});
