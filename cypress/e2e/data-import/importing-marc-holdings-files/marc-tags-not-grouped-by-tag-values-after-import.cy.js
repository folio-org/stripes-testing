import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import DataImport from '../../../support/fragments/data_import/dataImport';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Holdings files', () => {
    const randomPostfix = getRandomPostfix();
    const instanceTitle = `AT_C476783_MarcBibInstance_${randomPostfix}`;
    const holdingsFileName = 'marcHoldingsFileForC476783.mrc';
    const editedHoldingsFileName = `C476783_MarcHoldingsFile_${randomPostfix}.mrc`;
    const hridPlaceholder = 'plhd00000000000';
    const locCodePlaceholder = 'LOCCODE';

    // Expected field order after import: 001 is converted to 035 and inserted in ascending order
    const expectedTagsOrder = [
      'LDR',
      '001',
      '005',
      '004',
      '008',
      '014',
      '035',
      '868',
      '852',
      '866',
      '014',
      '868',
      '868',
      '999',
    ];

    let instanceId;
    let instanceHrid;
    let holdingsId;
    let location;
    const testData = { user: {} };

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        cy.getLocations({
          limit: 1,
          query: '(isActive=true and name<>"AT_*" and name<>"*auto*")',
        }).then((res) => {
          location = res;
        });
        cy.createSimpleMarcBibViaAPI(instanceTitle).then((id) => {
          instanceId = id;
          cy.getInstanceById(id).then((instanceData) => {
            instanceHrid = instanceData.hrid;
          });
        });
      });

      cy.createTempUser([]).then((userProperties) => {
        testData.user = userProperties;
        cy.assignCapabilitiesToExistingUser(
          testData.user.userId,
          [],
          [
            CapabilitySets.uiDataImport,
            CapabilitySets.uiInventory,
            CapabilitySets.uiQuickMarcQuickMarcHoldingsEditorManage,
          ],
        );
      });
    });

    after('Delete test data', () => {
      FileManager.deleteFile(`cypress/fixtures/${editedHoldingsFileName}`);
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      InventoryInstances.deleteFullInstancesByTitleViaApi(instanceTitle);
    });

    it(
      'C476783 MARC tags are not grouped by tag values after import of "MARC holdings" record (promin)',
      { tags: ['extendedPath', 'promin', 'C476783'] },
      () => {
        // Step 1: Replace HRID placeholder and import holdings via API
        DataImport.editMarcFile(
          holdingsFileName,
          editedHoldingsFileName,
          [hridPlaceholder, locCodePlaceholder],
          [instanceHrid, location.code],
        );
        cy.getToken(testData.user.username, testData.user.password);
        DataImport.uploadFileViaApi(
          editedHoldingsFileName,
          editedHoldingsFileName,
          DEFAULT_JOB_PROFILE_NAMES.CREATE_HOLDINGS_AND_SRS,
        ).then((response) => {
          holdingsId = response[0].holding.id;

          cy.login(testData.user.username, testData.user.password, {
            path: `/inventory/view/${instanceId}/${holdingsId}`,
            waiter: HoldingsRecordView.waitLoading,
          });
        });

        // Steps 4-6: Open quickMARC and verify fields are in original file order, not grouped
        HoldingsRecordView.editInQuickMarc();
        QuickMarcEditor.waitLoading();
        QuickMarcEditor.verifyRowOrderByTags(expectedTagsOrder);
      },
    );
  });
});
