import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import { Behavior } from '../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../support/fragments/settings/oai-pmh/behavior';
import getRandomPostfix from '../../../support/utils/stringTools';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';
import Permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import DateTools from '../../../support/utils/dateTools';

let user;
let currentDate;
const folioInstance = {
  title: `AT_C376997_FolioInstance_${getRandomPostfix()}`,
};
const marcInstance = {};
const marcBibFile = {
  marc: 'marcBibFileForC376997.mrc',
  fileNameImported: `testMarcBibFileC376997.${getRandomPostfix()}.mrc`,
  jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
};

describe('OAI-PMH', () => {
  describe('List identifiers', () => {
    before('create test data', () => {
      cy.getAdminToken();

      Behavior.updateBehaviorConfigViaApi(
        BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
        BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE_AND_INVENTORY,
        BEHAVIOR_SETTINGS_OPTIONS_API.DELETED_RECORDS_SUPPORT.PERSISTENT,
        BEHAVIOR_SETTINGS_OPTIONS_API.ERRORS_PROCESSING.OK_200,
      );

      cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: instanceTypes[0].id,
            title: folioInstance.title,
          },
        }).then((createdInstanceData) => {
          folioInstance.id = createdInstanceData.instanceId;
        });
      });

      DataImport.uploadFileViaApi(...Object.values(marcBibFile)).then((response) => {
        marcInstance.id = response[0].instance.id;
      });

      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.moduleDataImportEnabled.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventorySearchAndFilter.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(folioInstance.id);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(marcInstance.id);
      Users.deleteViaApi(user.userId);
      Behavior.updateBehaviorConfigViaApi();
    });

    it(
      'C376997 ListIdentifiers: SRS & Inventory - MARC and FOLIO edited instances are harvested with start and end date (oai_dc) (firebird)',
      { tags: ['extendedPathFlaky', 'firebird', 'C376997', 'nonParallel'] },
      () => {
        currentDate = DateTools.getCurrentDateForOaiPmh();

        // Step 1-2: Search for FOLIO instance by Source filter
        InventorySearchAndFilter.searchInstanceByTitle(folioInstance.id);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();

        // Step 3: Edit instance
        InstanceRecordView.edit();
        InstanceRecordEdit.waitLoading();

        // Step 4: Modify instance title
        const editedFolioTitle = `${folioInstance.title} Edited`;
        InstanceRecordEdit.fillResourceTitle(editedFolioTitle);

        // Step 5: Save and close
        InstanceRecordEdit.saveAndClose();
        InstanceRecordView.verifyInstanceRecordViewOpened();

        // Step 6: Send ListIdentifiers request with oai_dc and verify FOLIO instance is retrieved
        cy.getAdminToken();
        OaiPmh.listIdentifiersRequest('oai_dc', currentDate).then((response) => {
          OaiPmh.verifyIdentifierInListResponse(response, folioInstance.id, true);
          OaiPmh.verifyOaiPmhHeaderDatestamp(response, folioInstance.id);
        });

        // Step 7-8: Search for MARC instance by Source filter
        cy.getUserToken(user.username, user.password);
        InventorySearchAndFilter.resetAll();
        InventorySearchAndFilter.searchInstanceByTitle(marcInstance.id);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();

        // Step 9: Click Actions menu => Click "Edit MARC bibliographic record"
        InventoryInstance.goToEditMARCBiblRecord();
        QuickMarcEditor.waitLoading();

        // Step 10: Modify MARC record => Click "Save & close"
        QuickMarcEditor.updateExistingField('245', '$a AT_C376997_Modified MARC title');
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveAndClose();

        // Step 11: Send ListIdentifiers request with oai_dc and verify MARC instance is retrieved
        cy.getAdminToken();
        OaiPmh.listIdentifiersRequest('oai_dc', currentDate).then((response) => {
          OaiPmh.verifyIdentifierInListResponse(response, marcInstance.id, true);
          OaiPmh.verifyOaiPmhHeaderDatestamp(response, marcInstance.id);
        });
      },
    );
  });
});
