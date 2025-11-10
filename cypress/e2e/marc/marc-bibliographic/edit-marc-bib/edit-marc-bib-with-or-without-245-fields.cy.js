import { Permissions } from '../../../../support/dictionary';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import DataImport from '../../../../support/fragments/data_import/dataImport';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const testData = {
        tag245: '245',
        tag245Content:
          '$a Anglo-Saxon manuscripts in microfiche facsimile Volume 25 Corpus Christi College, Cambridge II, MSS 12, 144, 162, 178, 188, 198, 265, 285, 322, 326, 449 microform A. N. Doane (editor and director), Matthew T. Hussey (associate editor), Phillip Pulsiano (founding editor)',
        tagValue: 'C10935 Test',
        subfield245: '$a',
        errorMessages: {
          tagRequired: 'Fail: Tag must contain three characters and can only accept numbers 0-9.',
          field245Required: 'Field 245 is required.',
          nonRepeatable: 'Fail: Field is non-repeatable.',
        },
        marcFile: {
          marc: 'oneMarcBib.mrc',
          fileName: `testMarcFileC499627.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          propertyName: 'instance',
        },
      };
      let user;
      const instanceId = [];

      before('Create user', () => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((createdUserProperties) => {
          user = createdUserProperties;
          DataImport.uploadFileViaApi(
            testData.marcFile.marc,
            testData.marcFile.fileName,
            testData.marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              instanceId.push(record[testData.marcFile.propertyName].id);
            });
          });
          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });

      after('Delete user and instance', () => {
        cy.getAdminToken();
        InventoryInstance.deleteInstanceViaApi(instanceId);
        Users.deleteViaApi(user.userId);
      });

      it(
        'C10935 Cannot save existing MARC bibliographic record without or with multiple 245 fields (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C10935'] },
        () => {
          InventoryInstances.searchByTitle(instanceId[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();

          QuickMarcEditor.updateExistingTagName(testData.tag245, '');

          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(10, testData.errorMessages.tagRequired);
          QuickMarcEditor.checkCallout(testData.errorMessages.field245Required);

          QuickMarcEditor.deleteField(10);
          QuickMarcEditor.afterDeleteNotification('');

          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkCallout(testData.errorMessages.field245Required);

          QuickMarcEditor.undoDelete();
          QuickMarcEditor.checkContent(testData.tag245Content, 10);
          QuickMarcEditor.updateExistingTagName('', testData.tag245);

          QuickMarcEditor.addNewField(
            testData.tag245,
            `${testData.subfield245} ${testData.tagValue}`,
            10,
          );

          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(11, testData.errorMessages.nonRepeatable);
        },
      );
    });
  });
});
