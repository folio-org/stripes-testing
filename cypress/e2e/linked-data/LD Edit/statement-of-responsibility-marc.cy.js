import { DEFAULT_JOB_PROFILE_NAMES, EDIT_RESOURCE_HEADINGS } from '../../../support/constants';
import getRandomPostfix from '../../../support/utils/stringTools';
import FileManager from '../../../support/utils/fileManager';

import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

import EditResource from '../../../support/fragments/linked-data/editResource';
import PreviewResource from '../../../support/fragments/linked-data/previewResource';
import InstanceProfileModal from '../../../support/fragments/linked-data/instanceProfileModal';
import Marigold from '../../../support/fragments/linked-data/marigold';
import NewInstance from '../../../support/fragments/linked-data/newInstance';
import SearchAndFilter from '../../../support/fragments/linked-data/searchAndFilter';
import ViewMarc from '../../../support/fragments/linked-data/viewMarc';
import Work from '../../../support/fragments/linked-data/work';
import WorkProfileModal from '../../../support/fragments/linked-data/workProfileModal';

import {
  MARIGOLD_CAPABILITIES,
  MARIGOLD_CAPABILITY_SETS,
} from '../../../support/dictionary/marigoldCapabilities';

let user;

describe('Citation: Statement of Responsibility - Inventory / View MARC', () => {
  const fieldNames = {
    statementOfResponsibility: 'Statement of Responsibility',
    preferredTitle: 'Preferred Title for Work',
    marcEquivalent: '245 $c',
  };

  const testData = {
    marcFilePath: 'marcFileForC477531.mrc',
    modifiedMarcFile: `C477531 editedMarcFile${getRandomPostfix()}.mrc`,
    marcFileName: `C477531 marcFile${getRandomPostfix()}.mrc`,
    uniqueMarcTitle: `Modern data science ${getRandomPostfix()}`,
    uniqueLdTitle: `Test Statement of Responsibility. LD ${getRandomPostfix()}`,
    originalResponsibility: 'Emily Johnson',
    updatedResponsibility: 'E.A. Johnson',
    ldResponsibility: 'Smith, John',
    marcWorkId: null,
    marcInstanceId: null,
    workId: null,
    instanceId: null,
  };

  before('Create test data', () => {
    DataImport.editMarcFile(
      testData.marcFilePath,
      testData.modifiedMarcFile,
      ['Modern data science'],
      [testData.uniqueMarcTitle],
    );
    cy.getAdminToken();

    cy.createTempUser([]).then((userProperties) => {
      user = userProperties;
      cy.assignCapabilitiesToExistingUser(
        user.userId,
        MARIGOLD_CAPABILITIES,
        MARIGOLD_CAPABILITY_SETS,
      );
    });

    DataImport.uploadFileViaApi(
      testData.modifiedMarcFile,
      testData.marcFileName,
      DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
    );
  });

  after('Delete test data', () => {
    FileManager.deleteFile(`cypress/fixtures/${testData.modifiedMarcFile}`);
    cy.getAdminToken();
    InventoryInstances.deleteFullInstancesByTitleViaApi(testData.uniqueMarcTitle);
    if (testData.marcInstanceId) Work.deleteInstanceViaApi(testData.marcInstanceId);
    if (testData.marcWorkId) Work.deleteById(testData.marcWorkId);
    if (testData.instanceId) Work.deleteInstanceViaApi(testData.instanceId);
    if (testData.workId) Work.deleteById(testData.workId);
    Users.deleteViaApi(user.userId);
  });

  beforeEach(() => {
    cy.login(user.username, user.password, {
      path: TopMenu.inventoryPath,
      waiter: InventoryInstances.waitContentLoading,
      authRefresh: true,
    });
  });

  it(
    'C477531 Marigold - Statement of responsibility / Inventory / View MARC',
    { tags: ['criticalPath', 'citation', 'C477531', 'marigold'] },
    () => {
      // Import MARC bib into Marigold
      InventoryInstances.searchByTitle(testData.uniqueMarcTitle);
      InventoryInstance.editInstanceInMG();
      PreviewResource.waitLoading();
      PreviewResource.clickContinue();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);
      EditResource.clickCloseResourceButton();

      // Step 1: Search for MARC-based Work > Edit Instance > Check Statement of Responsibility
      SearchAndFilter.searchResourceByTitle(testData.uniqueMarcTitle);
      Marigold.editInstanceFromSearchTable(1, 1);
      EditResource.checkSectionFieldValue(
        testData.originalResponsibility,
        fieldNames.statementOfResponsibility,
      );

      // Step 2: Update Statement of Responsibility > Save & close > Reopen > Verify
      EditResource.setSectionFieldValue(
        testData.updatedResponsibility,
        fieldNames.statementOfResponsibility,
      );
      EditResource.saveAndCloseWithIds().then(({ workId, instanceId }) => {
        testData.marcWorkId = workId;
        testData.marcInstanceId = instanceId;
      });
      SearchAndFilter.searchResourceByTitle(testData.uniqueMarcTitle);
      Marigold.editInstanceFromSearchTable(1, 1);
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);
      EditResource.checkSectionFieldValue(
        testData.updatedResponsibility,
        fieldNames.statementOfResponsibility,
      );

      // Step 3: View MARC > Verify 245 $c
      EditResource.viewMarc();
      ViewMarc.waitLoading();
      ViewMarc.checkMarcFieldContainsData(245, `$a ${testData.uniqueMarcTitle}`);
      ViewMarc.checkMarcFieldContainsData(245, `$c ${testData.updatedResponsibility}`);
      ViewMarc.closeMarcView();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);
      EditResource.clickCloseResourceButton();

      // Create LD record with title and instance
      Marigold.openNewResourceForm();
      WorkProfileModal.waitLoading();
      WorkProfileModal.selectDefaultOption();
      EditResource.setValueForTheField(testData.uniqueLdTitle, fieldNames.preferredTitle);
      EditResource.saveAndKeepEditingWithId().then(({ resourceId }) => {
        testData.workId = resourceId;
      });
      EditResource.openNewInstanceFormViaNewInstanceButton();
      InstanceProfileModal.waitLoading();
      InstanceProfileModal.selectDefaultOption();
      NewInstance.addMainInstanceTitle(testData.uniqueLdTitle);
      EditResource.saveAndKeepEditing();
      EditResource.clickCloseResourceButton();

      // Step 4: Search for LD Work > Edit Instance > Click info icon > Verify MARC equivalents
      SearchAndFilter.searchResourceByTitle(testData.uniqueLdTitle);
      Marigold.editInstanceFromSearchTable(1, 1);
      EditResource.toggleSingleFieldMarcTooltip(fieldNames.statementOfResponsibility);
      EditResource.checkMarcTooltipContains(
        fieldNames.statementOfResponsibility,
        fieldNames.marcEquivalent,
      );

      // Step 5: Enter Statement of Responsibility > Save & keep editing > View MARC > Verify
      EditResource.setSectionFieldValue(
        testData.ldResponsibility,
        fieldNames.statementOfResponsibility,
      );
      EditResource.saveAndKeepEditingWithId().then(({ resourceId }) => {
        testData.instanceId = resourceId;
      });
      EditResource.viewMarc();
      ViewMarc.waitLoading();
      ViewMarc.checkMarcFieldContainsData(245, `$a ${testData.uniqueLdTitle}`);
      ViewMarc.checkMarcFieldContainsData(245, `$c ${testData.ldResponsibility}`);
      ViewMarc.closeMarcView();
    },
  );
});
