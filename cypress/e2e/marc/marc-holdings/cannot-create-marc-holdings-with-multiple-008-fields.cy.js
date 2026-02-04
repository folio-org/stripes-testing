import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    const testData = {
      tag852: '852',
      tag008: '008',
      errorMessage: 'Record cannot be saved with more than one 008 field',
    };
    const marcFile = {
      marc: 'oneMarcBib.mrc',
      fileName: `testMarcFileC499629.${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      propertyName: 'instance',
    };
    let user;
    let instanceID;

    before(() => {
      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorCreate.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
      ]).then((createdUserProperties) => {
        user = createdUserProperties;

        cy.getAdminToken().then(() => {
          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              instanceID = record[marcFile.propertyName].id;
            });
          });
        });

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Deleting created user, data', () => {
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(instanceID);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C499629 Cannot Create a new MARC holdings record with multiple "008" fields (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C499629'] },
      () => {
        InventoryInstances.searchByTitle(instanceID);
        InventoryInstances.selectInstance();
        InventoryInstance.goToMarcHoldingRecordAdding();
        QuickMarcEditor.waitLoading();

        QuickMarcEditor.updateExistingField(testData.tag852, QuickMarcEditor.getExistingLocation());

        QuickMarcEditor.addNewField(testData.tag008, '', 4);

        QuickMarcEditor.pressSaveAndCloseButton();
        QuickMarcEditor.checkErrorMessage(4, testData.errorMessage);
        QuickMarcEditor.checkErrorMessage(5, testData.errorMessage);
      },
    );
  });
});
