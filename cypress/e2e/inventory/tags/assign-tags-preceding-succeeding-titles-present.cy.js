import uuid from 'uuid';
import {
  ACCEPTED_DATA_TYPE_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import JobProfileView from '../../../support/fragments/data_import/job_profiles/jobProfileView';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventorySteps from '../../../support/fragments/inventory/inventorySteps';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import getRandomStringCode from '../../../support/utils/generateTextCode';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TagsGeneral from '../../../support/fragments/settings/tags/tags-general';

describe('Inventory', () => {
  describe('Tags', () => {
    let userData;
    const tagC358961 = `tagc358961${uuid()}`;
    const tagC358962 = `tagc358962${uuid()}`;
    const tagsC367962 = [...Array(5)].map(() => `tag${getRandomStringCode(5)}`.toLowerCase());
    const testData = {
      userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
      fileName: `testFile.${getRandomPostfix()}.mrc`,
    };

    before('Preconditions', () => {
      cy.getAdminToken();
      ServicePoints.createViaApi(testData.userServicePoint);
      cy.createTempUser([
        permissions.uiUserCanEnableDisableTags.gui,
        permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        permissions.moduleDataImportEnabled.gui,
        permissions.inventoryAll.gui,
        permissions.uiTagsPermissionAll.gui,
      ]).then((userProperties) => {
        userData = userProperties;
        UserEdit.addServicePointViaApi(
          testData.userServicePoint.id,
          userData.userId,
          testData.userServicePoint.id,
        );
      });
    });

    after('Deleting created entities', () => {
      cy.getAdminToken();
      UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.userServicePoint.id]);
      ServicePoints.deleteViaApi(testData.userServicePoint.id);
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C358962 Assign tags to an Instance record when unlinked preceding/succeeding titles present 2: Source = FOLIO (volaris)',
      { tags: ['extendedPath', 'volaris', 'C358962'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
        DataImport.verifyUploadState();
        DataImport.uploadFileAndRetry('marcFileForC358962.mrc', testData.fileName);
        JobProfiles.waitLoadingList();
        JobProfiles.search('Default - Create instance and SRS MARC Bib');
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(testData.fileName);
        Logs.checkJobStatus(testData.fileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(testData.fileName);
        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
        InventorySearchAndFilter.verifyInstanceDetailsView();
        InventorySearchAndFilter.openTagsField();
        InventorySearchAndFilter.verifyTagsView();
        InventorySearchAndFilter.addTag(tagC358962);
        InteractorsTools.checkCalloutMessage('New tag created');
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.switchToInstance();
        InventorySearchAndFilter.filterByTag(tagC358962);
        InventorySearchAndFilter.verifyInstanceDetailsView();
        InventorySearchAndFilter.openTagsField();
        InventorySearchAndFilter.verifyTagsView();
        InventoryInstance.deleteTag(tagC358962);
        InventorySearchAndFilter.verifyTagCount();
        InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
        InventorySearchAndFilter.verifyTagIsAbsent(tagC358962);
      },
    );

    it(
      'C358961 Assign tags to an Instance record when unlinked preceding/succeeding titles present 3: quickMARC (volaris)',
      { tags: ['extendedPathFlaky', 'volaris', 'C358961'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: SettingsMenu.tagsGeneralPath,
          waiter: TagsGeneral.waitLoading,
        });
        TagsGeneral.changeEnableTagsStatus('enable');
        cy.visit(TopMenu.inventoryPath);
        InventoryInstances.waitContentLoading();
        InventorySearchAndFilter.bySource(ACCEPTED_DATA_TYPE_NAMES.MARC);
        InventoryInstances.selectInstance();
        InventorySearchAndFilter.verifyInstanceDetailsView();
        InventoryInstance.viewSource();
        InventoryViewSource.notContains('780\t');
        InventoryViewSource.notContains('785\t');
        InventoryViewSource.close();
        InventorySearchAndFilter.verifyInstanceDetailsView();
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.addEmptyFields(5);
        QuickMarcEditor.addValuesToExistingField(5, '780', '$t preceding $x 1234-1234', '0', '0');
        cy.wait(1000);
        QuickMarcEditor.addEmptyFields(6);
        cy.wait(1000);
        QuickMarcEditor.addValuesToExistingField(6, '785', '$t succeeding $x 1234-1234', '0', '0');
        cy.wait(1000);
        QuickMarcEditor.saveAndCloseWithValidationWarnings();
        QuickMarcEditor.checkAfterSaveAndClose();
        InventorySearchAndFilter.verifyInstanceDetailsView();
        InventorySearchAndFilter.openTagsField();
        InventorySearchAndFilter.verifyTagsView();
        InventorySearchAndFilter.addTag(tagC358961);
        InteractorsTools.checkCalloutMessage('New tag created');
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.switchToInstance();
        InventorySearchAndFilter.filterByTag(tagC358961);
        InventorySearchAndFilter.verifyInstanceDetailsView();
        InventorySearchAndFilter.openTagsField();
        InventorySearchAndFilter.verifyTagsView();
        InventoryInstance.deleteTag(tagC358961);
        InventorySearchAndFilter.closeTagsPane();
        InventorySearchAndFilter.verifyTagCount();
        InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
        InventorySearchAndFilter.verifyTagIsAbsent(tagC358961);

        // Cleanup — remove fields 780 and 785
        cy.visit(TopMenu.inventoryPath);
        InventoryInstances.waitContentLoading();
        InventorySearchAndFilter.bySource(ACCEPTED_DATA_TYPE_NAMES.MARC);
        InventoryInstances.selectInstance();
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.deleteFieldByTagAndCheck('780');
        QuickMarcEditor.deleteFieldByTagAndCheck('785');
        QuickMarcEditor.saveAndCloseAfterFieldDelete();
        QuickMarcEditor.checkAfterSaveAndClose();
      },
    );

    it(
      'C367962 Verify that user can add more than 1 tag to "Holdings" record with source "MARC" (volaris)',
      { tags: ['extendedPath', 'volaris', 'C367962'] },
      () => {
        cy.loginAsAdmin({
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventorySearchAndFilter.byKeywords('Houston/Texas oil directory');
        InventoryInstances.selectInstance();
        InventorySteps.addMarcHoldingRecord();

        cy.login(userData.username, userData.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.bySource(ACCEPTED_DATA_TYPE_NAMES.MARC);
        InventorySearchAndFilter.byKeywords('Houston/Texas oil directory');
        InventoryInstances.selectInstance();
        InventoryInstance.openHoldingView();

        HoldingsRecordEdit.openTags();
        cy.wrap(tagsC367962).each((tag) => {
          cy.wait(500);
          HoldingsRecordEdit.addTag(tag);
        });

        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.byKeywords('Houston/Texas oil directory');
        InventoryInstances.selectInstance();
        InventoryInstance.openHoldingView();
        HoldingsRecordEdit.openTags();
        cy.wrap(tagsC367962).each((tag) => {
          cy.wait(2000);
          JobProfileView.removeTag(tag);
        });
      },
    );
  });
});
