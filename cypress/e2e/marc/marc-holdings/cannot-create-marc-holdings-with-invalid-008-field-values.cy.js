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
      rowIndex: 4,
      tag852: '852',
      acqEndDateBox: 'records[4].content.AcqEndDate',
      invalidAcqEndDate: '///',
      errorMessage: 'Record not saved. Please check the character length of the fixed fields.',
    };
    const marcFile = {
      marc: 'oneMarcBib.mrc',
      fileName: `testMarcFileC503018.${getRandomPostfix()}.mrc`,
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
      'C503018 Cannot Create a new MARC holdings record with not valid value in "008" fields (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C503018'] },
      () => {
        InventoryInstances.searchByTitle(instanceID);
        InventoryInstances.selectInstance();
        InventoryInstance.goToMarcHoldingRecordAdding();
        QuickMarcEditor.waitLoading();

        QuickMarcEditor.updateExistingField(testData.tag852, QuickMarcEditor.getExistingLocation());

        QuickMarcEditor.fillEmptyTextFieldOfField(
          testData.rowIndex,
          testData.acqEndDateBox,
          testData.invalidAcqEndDate,
        );

        QuickMarcEditor.pressSaveAndCloseButton();
        QuickMarcEditor.checkCallout(testData.errorMessage);
      },
    );
  });
});
