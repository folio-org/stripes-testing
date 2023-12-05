import getRandomPostfix from '../../../../support/utils/stringTools';
import Permissions from '../../../../support/dictionary/permissions';
import TopMenu from '../../../../support/fragments/topMenu';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import Users from '../../../../support/fragments/users/users';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';

const testData = {
  new100fieldRecordForFirstFile: getRandomPostfix(),
  new100fieldRecordForSecondFile: getRandomPostfix(),
};
const jobProfileToRun = 'Default - Create SRS MARC Authority';
const fileName = 'marcFileForC387474.mrc';
const updatedFileName = `testMarcFileUpd.${getRandomPostfix()}.mrc`;
let createdAuthorityID;

describe('MARC › MARC Authority › Edit Authority record', () => {
  before('Creating data', () => {
    cy.createTempUser([
      Permissions.moduleDataImportEnabled.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;
      cy.loginAsAdmin({
        path: TopMenu.dataImportPath,
        waiter: DataImport.waitLoading,
      }).then(() => {
        DataImport.verifyUploadState();
        DataImport.uploadFileAndRetry(fileName, updatedFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.waitLoadingList();
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(updatedFileName);
        Logs.checkStatusOfJobProfile('Completed');
        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });
  });

  after('Deleting data', () => {
    cy.getAdminToken();
    if (createdAuthorityID) MarcAuthority.deleteViaAPI(createdAuthorityID);
    Users.deleteViaApi(testData.userProperties.userId);
  });

  it(
    'C387474 User can edit imported "MARC authority" file without required number (40) of "008" positions (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      Logs.openFileDetails(updatedFileName);
      Logs.getCreatedItemsID().then((link) => {
        createdAuthorityID = link.split('/')[5];
      });
      Logs.verifyInstanceStatus(0, 2);
      Logs.verifyInstanceStatus(1, 2);
      Logs.clickOnHotLink(0, 6, 'Created');
      MarcAuthority.edit();
      QuickMarcEditor.check008BoxesCount(19);
      QuickMarcEditor.updateValueOf008BoxByBoxName('Geo Subd', 'b');
      QuickMarcEditor.updateExistingFieldContent(9, testData.new100fieldRecordForFirstFile);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndCloseAuthority();
      TopMenu.openDataImportApp();
      Logs.verifyInstanceStatus(0, 2);
      Logs.verifyInstanceStatus(1, 2);
      Logs.clickOnHotLink(1, 6, 'Created');
      MarcAuthority.edit();
      QuickMarcEditor.check008BoxesCount(19);
      QuickMarcEditor.updateValueOf008BoxByBoxName('Geo Subd', 'a');
      QuickMarcEditor.updateExistingFieldContent(9, testData.new100fieldRecordForSecondFile);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndCloseAuthority();
    },
  );
});
