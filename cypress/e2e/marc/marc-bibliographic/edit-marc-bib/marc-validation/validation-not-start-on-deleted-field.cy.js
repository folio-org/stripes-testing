import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    const marcFile = {
      marc: 'marcBibFileForC552375.mrc',
      fileName: `C552375testMarcFile${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      numOfRecords: 1,
      propertyName: 'instance',
    };
    const testData = {
      createdRecordIDs: [],
      userProperties: {},
    };
    const fieldValue = {
      tag: '245',
      newValue: '$a Updated Title',
    };

    const fields = [
      {
        tag: '100',
        index: 13,
      },
      {
        tag: '100',
        index: 14,
      },
      {
        tag: '222',
        index: 15,
      },
      {
        tag: '853',
        index: 28,
      },
      {
        tag: '863',
        index: 29,
      },
      {
        tag: '948',
        index: 30,
      },
      {
        tag: '950',
        index: 31,
      },
    ];

    before(() => {
      cy.getAdminToken();
      cy.getSpecificationIds().then((specifications) => {
        specifications.forEach(({ id }) => {
          cy.syncSpecifications(id);
        });
      });
      DataImport.uploadFileViaApi(marcFile.marc, marcFile.fileName, marcFile.jobProfileToRun).then(
        (response) => {
          response.forEach((record) => {
            testData.createdRecordIDs.push(record[marcFile.propertyName].id);
          });
        },
      );

      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      ]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;
        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after(() => {
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(testData.createdRecordIDs[0]);
    });
    describe('Edit MARC bib', () => {
      it(
        "C552375 MARC validation doesn't start on deleted field during editing of MARC bib record (spitfire)",
        { tags: ['criticalPath', 'spitfire', 'C552375'] },
        () => {
          InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.updateExistingField(fieldValue.tag, fieldValue.newValue);
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessageForField(
            fields[0].index,
            'Fail: Field 1XX is non-repeatable.Help',
          );
          fields.forEach(({ index }) => {
            QuickMarcEditor.deleteField(index);
          });
          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.confirmDelete();
          QuickMarcEditor.verifyAndDismissRecordUpdatedCallout();
          fields.forEach(({ tag }) => {
            QuickMarcEditor.checkFieldAbsense(tag);
          });
        },
      );
    });
  });
});
