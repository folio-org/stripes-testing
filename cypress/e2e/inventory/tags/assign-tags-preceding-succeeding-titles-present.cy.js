import uuid from 'uuid';
import {
  ACCEPTED_DATA_TYPE_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import JobProfileView from '../../../support/fragments/data_import/job_profiles/jobProfileView';
import InventorySteps from '../../../support/fragments/inventory/inventorySteps';

describe('Inventory', () => {
  describe('Tags', () => {
    let userData;
    const tagC358961 = `tagc358961${uuid()}`;
    const tagC358962 = `tagc358962${uuid()}`;
    const tagsC367962 = [...Array(5)].map((_, index) => `tag${index + 1}${uuid()}`);
    const testData = {
      userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
      fileName: `testFile.${getRandomPostfix()}.mrc`,
    };

    before('Preconditions', () => {
      cy.getAdminToken();
      ServicePoints.createViaApi(testData.userServicePoint);
      cy.createTempUser([
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
      'C358144 Assign tags to an Instance record when unlinked preceding/succeeding titles present 1: Import (volaris)',
      { tags: ['extendedPath', 'volaris'] },
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
        cy.reload();
        InventorySearchAndFilter.verifyTagIsAbsent(tagC358962);
      },
    );

    it(
      'C358961 Assign tags to an Instance record when unlinked preceding/succeeding titles present 3: quickMARC (volaris)',
      { tags: ['extendedPath', 'volaris'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventorySearchAndFilter.bySource(ACCEPTED_DATA_TYPE_NAMES.MARC);
        InventoryInstances.selectInstance();
        InventorySearchAndFilter.verifyInstanceDetailsView();
        InventoryInstance.viewSource();
        InventoryViewSource.notContains('780');
        InventoryViewSource.notContains('785');
        InventoryViewSource.close();
        InventorySearchAndFilter.verifyInstanceDetailsView();
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.addEmptyFields(5);
        QuickMarcEditor.addValuesToExistingField(5, '780', '$t preceding $x 1234-1234', '0', '0');
        QuickMarcEditor.addEmptyFields(6);
        QuickMarcEditor.addValuesToExistingField(6, '785', '$t succeeding $x 1234-1234', '0', '0');
        QuickMarcEditor.pressSaveAndClose();
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
        InventorySearchAndFilter.verifyTagCount();
        InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
        cy.reload();
        InventorySearchAndFilter.verifyTagIsAbsent(tagC358961);
      },
    );

    it(
      'C367962 Verify that user can add more than 1 tag to "Holdings" record with source "MARC" (volaris)',
      { tags: ['extendedPath', 'volaris'] },
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
          cy.wait(2000);
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
