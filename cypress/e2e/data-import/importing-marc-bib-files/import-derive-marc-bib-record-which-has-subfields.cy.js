import getRandomPostfix from '../../../support/utils/stringTools';
import { RECORD_STATUSES, DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Users from '../../../support/fragments/users/users';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';

const testData = {
  new050fieldRecord: '$a BR140 $b .J6 $9 testing',
  new082fieldRecord: '$a 270.05 $9 testing',
  new260fieldRecord: '$a London, $b Cambridge University Press [etc.] $9 testing $9 more testing',
};
const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;
const fileName = 'marBibFileC380502.mrc';
const updatedFileName = `testMarcFileUpd.${getRandomPostfix()}.mrc`;
let createdAuthorityID;

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    before('Creating data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
      ]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;
        cy.waitForAuthRefresh(() => {
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.dataImportPath,
            waiter: DataImport.waitLoading,
          });
        }, 20_000);
      });
    });

    after('Deleting data', () => {
      cy.getAdminToken();
      if (createdAuthorityID) InventoryInstance.deleteInstanceViaApi(createdAuthorityID);
      Users.deleteViaApi(testData.userProperties.userId);
    });

    it(
      'C380502 Import and derive "MARC Bib" record which has subfields "$9" in fields NOT eligible for linking (spitfire) (TaaS)',
      { tags: ['extendedPath', 'spitfire', 'C380502'] },
      () => {
        DataImport.verifyUploadState();
        DataImport.uploadFile(fileName, updatedFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.waitLoadingList();
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(updatedFileName);
        Logs.checkStatusOfJobProfile('Completed');
        Logs.openFileDetails(updatedFileName);
        Logs.getCreatedItemsID().then((link) => {
          createdAuthorityID = link.split('/')[5];
        });
        Logs.clickOnHotLink(0, 3, RECORD_STATUSES.CREATED);
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.checkLinkButtonDontExist('050');
        QuickMarcEditor.checkLinkButtonDontExist('082');
        QuickMarcEditor.checkLinkButtonDontExist('260');
        QuickMarcEditor.pressCancel();
        InventoryInstance.deriveNewMarcBib();
        QuickMarcEditor.updateExistingFieldContent(11);
        QuickMarcEditor.updateExistingFieldContent(9, testData.new050fieldRecord);
        QuickMarcEditor.updateExistingFieldContent(10, testData.new082fieldRecord);
        QuickMarcEditor.updateExistingFieldContent(13, testData.new260fieldRecord);
        QuickMarcEditor.pressSaveAndCloseButton();
        InventoryInstance.waitLoading();
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.checkFieldContentToEqual(
          'textarea[name="records[6].content"]',
          testData.new050fieldRecord,
        );
        QuickMarcEditor.checkFieldContentToEqual(
          'textarea[name="records[7].content"]',
          testData.new082fieldRecord,
        );
        QuickMarcEditor.checkFieldContentToEqual(
          'textarea[name="records[10].content"]',
          testData.new260fieldRecord,
        );
        QuickMarcEditor.pressCancel();
        InventoryInstance.viewSource();
        InventoryViewSource.checkFieldContentMatch('050', /\$9/);
        InventoryViewSource.checkFieldContentMatch('082', /\$9/);
        InventoryViewSource.checkFieldContentMatch('260', /\$9.*\$9/);
      },
    );
  });
});
