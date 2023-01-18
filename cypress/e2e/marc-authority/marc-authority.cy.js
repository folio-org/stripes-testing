import getRandomPostfix from '../../support/utils/stringTools';
import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import DataImport from '../../support/fragments/data_import/dataImport';
import MarcAuthority from '../../support/fragments/marcAuthority/marcAuthority';
import Users from '../../support/fragments/users/users';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../support/fragments/data_import/logs/logs';
import SettingsMenu from '../../support/fragments/settingsMenu';
import NewJobProfile from '../../support/fragments/data_import/job_profiles/newJobProfile';
import MarcAuthorities from '../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthorityBrowse from '../../support/fragments/marcAuthority/MarcAuthorityBrowse';

describe('Importing MARC Authority files', () => {
  const testData = {
    authority: {
      title: 'Congress and foreign policy series',
      nonExactTitle: 'Congress',
      ldr: '00846cz\\\\a2200241n\\\\4500',
      searchOption: 'Uniform title',
      newField: {
        title: `Test authority ${getRandomPostfix()}`,
        tag: '901',
        content: 'venn'
      }
    }
  };
  const jobProfileToRun = 'Default - Create SRS MARC Authority';
  const createdJobProfile = {
    profileName: `Update MARC authority records - 010 $a ${getRandomPostfix()}`,
    acceptedType: 'MARC',
  };
  let fileName = `testMarcFile.${getRandomPostfix()}.mrc`;
  let createdAuthorityID;

  before('Creating data', () => {
    cy.createTempUser([
      Permissions.settingsDataImportEnabled.gui,
      Permissions.moduleDataImportEnabled.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui,
      Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui
    ]).then(createdUserProperties => {
      testData.userProperties = createdUserProperties;
    });

    cy.loginAsAdmin({ path: SettingsMenu.jobProfilePath, waiter: JobProfiles.waitLoadingList }).then(() => {
      JobProfiles.createJobProfile(createdJobProfile);
      NewJobProfile.linkActionProfileByName('Default - Create MARC Authority');
      NewJobProfile.saveAndClose();

      cy.visit(TopMenu.dataImportPath)
      DataImport.uploadFile('oneMarcAuthority.mrc', fileName);
      JobProfiles.waitLoadingList();
      JobProfiles.searchJobProfileForImport(jobProfileToRun);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(fileName);
      Logs.checkStatusOfJobProfile('Completed');
      Logs.openFileDetails(fileName);
      Logs.getCreatedItemsID().then(link => {
        createdAuthorityID = link.split('/')[5];
      });
    });
  });

  beforeEach('Login to the application', () => {
    cy.login(testData.userProperties.username, testData.userProperties.password, { path: TopMenu.marcAuthorities, waiter: MarcAuthorities.waitLoading });
  });

  after('Deleting data', () => {
    cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
    DataImport.selectLog();
    DataImport.openDeleteImportLogsModal();
    DataImport.confirmDeleteImportLogs();

    JobProfiles.deleteJobProfile(createdJobProfile.profileName);
    if (createdAuthorityID) MarcAuthority.deleteViaAPI(createdAuthorityID);
    Users.deleteViaApi(testData.userProperties.userId);
  });

  it('C350667 Update a MARC authority record via data import. Record match with 010 $a (spitfire)', { tags: [TestTypes.smoke, DevTeams.spitfire] }, () => {
    cy.visit(TopMenu.dataImportPath);
    DataImport.uploadFile('test-auth-file.mrc', fileName);
    JobProfiles.waitLoadingList();
    JobProfiles.searchJobProfileForImport(createdJobProfile.profileName);
    JobProfiles.runImportFile();
    JobProfiles.waitFileIsImported(fileName);
    Logs.checkStatusOfJobProfile('Completed');
    Logs.openFileDetails(fileName);
    Logs.goToTitleLink('Created');
    MarcAuthority.contains('MARC');
  });

  it('C350575 MARC Authority fields LEADER and 008 can not be deleted (spitfire)', { tags: [TestTypes.smoke, DevTeams.spitfire] }, () => {
    MarcAuthorities.searchBy(testData.authority.searchOption, testData.authority.title);
    MarcAuthorities.selectFirst(testData.authority.title);
    MarcAuthority.edit();
    MarcAuthority.checkNotDeletableTags('008')
  });

  it('C350576 Update 008 of Authority record (spitfire)', { tags: [TestTypes.smoke, DevTeams.spitfire] }, () => {
    MarcAuthorities.searchBy(testData.authority.searchOption, testData.authority.title);
    MarcAuthorities.selectFirst(testData.authority.title);
    MarcAuthority.edit();
    MarcAuthority.change008Field('x', 'x', 'x');
    MarcAuthority.clicksaveAndCloseButton();
    MarcAuthority.contains('xxx');
  });

  it('C350578 Browse existing Authorities (spitfire)', { tags: [TestTypes.smoke, DevTeams.spitfire] }, () => {
    const checkPresentedColumns = ['Authorized/Reference', 'Heading/Reference', 'Type of heading'];

    MarcAuthorities.searchBy(testData.authority.searchOption, testData.authority.title);
    MarcAuthority.checkPresentedColumns(checkPresentedColumns);
  });

  it('C350513 Browse authority - handling for when there is no exact match (spitfire)', { tags: [TestTypes.smoke, DevTeams.spitfire] }, () => {
    MarcAuthorities.switchToBrowse();
    MarcAuthorityBrowse.checkSearchOptions();
    MarcAuthorityBrowse.searchBy(testData.authority.searchOption, testData.authority.nonExactTitle);
    MarcAuthorityBrowse.checkHeadingReference(testData.authority.nonExactTitle);
  });

  it('C350902 MARC fields behavior when editing "MARC Authority" record (spitfire)', { tags: [TestTypes.smoke, DevTeams.spitfire] }, () => {
    MarcAuthorities.searchBy(testData.authority.searchOption, testData.authority.title);
    MarcAuthorities.selectFirst(testData.authority.title);
    MarcAuthority.edit();
    MarcAuthority.checkLDRValue(testData.authority.ldr)
    MarcAuthority.check008Field();
    MarcAuthority.checkRemovedTag(9);
  });

  it('C350572 Edit an Authority record (spitfire)', { tags: [TestTypes.criticalPath, DevTeams.spitfire] }, () => {
    MarcAuthorities.searchBy(testData.authority.searchOption, testData.authority.title);
    MarcAuthorities.selectFirst(testData.authority.title);
    MarcAuthority.edit();
    MarcAuthority.addNewField(5, testData.authority.newField.tag, `$a ${testData.authority.newField.content}`);
    MarcAuthority.changeField('130', testData.authority.newField.title);
    MarcAuthority.clicksaveAndCloseButton();

    MarcAuthority.contains(testData.authority.newField.tag);
    MarcAuthority.contains(testData.authority.newField.content);

    MarcAuthorities.searchBy(testData.authority.searchOption, testData.authority.newField.title);
    MarcAuthorities.checkRow(testData.authority.newField.title);
  });
});
