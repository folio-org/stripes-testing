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
import MarcAuthorities from '../../support/fragments/marcAuthority/marcAuthorities';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';
import MarcFieldProtection from '../../support/fragments/settings/dataImport/marcFieldProtection';

describe('MARC Authority -> Edit Authority record', () => {
  const testData = {
    authority: {
      title: 'Twain, Mark, 1835-1910. Adventures of Huckleberry Finn',
      searchOption: 'Keyword',
    }
  };
  const jobProfileToRun = 'Default - Create SRS MARC Authority';
  const fileName = `testMarcFile.${getRandomPostfix()}.mrc`;
  const newFieldsArr = [
    ['245', '1', '\\', '$a Added row (must indicate)'],
    ['260', '1', '1', '$b Added row (not indicate)'],
    ['520', '\\', '\\', '$a Added row (must indicate)'],
    ['655', '1', '1', '$b Added row (must indicate)'],
    ['655', '2', '1', '$b Added row (not indicate)'],
    ['655', '1', '2', '$a Added row (not indicate)'],
    ['655', '\\', '\\', '$a Added row (must indicate)'],
  ];
  const protectedMARCFields = [
    ['245', '*', '*', 'a', '*'],
    ['260', '1', '1', 'b', 'must indicate'],
    ['520', '*', '*', '*', '*'],
    ['655', '1', '*', 'b', '*'],
    ['655', '*', '*', '*', 'Added row (must indicate)'],
  ];
  const marcFieldProtectionRules = [];
  let createdAuthorityID;

  before('', () => {
    cy.createTempUser([
      Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
    ]).then(createdUserProperties => {
      testData.userProperties = createdUserProperties;
    });

    cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
      DataImport.uploadFile('marcFileForC350901.mrc', fileName);
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

  beforeEach('', () => {
    cy.login(testData.userProperties.username, testData.userProperties.password, { path: TopMenu.marcAuthorities, waiter: MarcAuthorities.waitLoading });
  });

  after('', () => {
    cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
    DataImport.selectLog();
    DataImport.openDeleteImportLogsModal();
    DataImport.confirmDeleteImportLogs();

    if (createdAuthorityID) MarcAuthority.deleteViaAPI(createdAuthorityID);
    Users.deleteViaApi(testData.userProperties.userId);
    marcFieldProtectionRules.forEach(ruleID => {
      if (ruleID) MarcFieldProtection.deleteMarcFieldProtectionViaApi(ruleID);
    });
  });

  it('C350901 Add multiple / delete 1XX tag of "MARC Authority" record (spitfire)', { tags: [TestTypes.criticalPath, DevTeams.spitfire] }, () => {
    MarcAuthorities.searchBy(testData.authority.searchOption, testData.authority.title);
    MarcAuthorities.selectTitle(testData.authority.title);
    MarcAuthority.edit();
    MarcAuthority.checkRemoved1XXTag(14)
    MarcAuthority.checkAddNew1XXTag(14, '100', '$a')
    QuickMarcEditor.closeWithoutSavingAfterChange();
    MarcAuthority.contains(testData.authority.title);
  });

  it('C353536 Add multiple 001s when editing "MARC Authority" record (spitfire)', { tags: [TestTypes.criticalPath, DevTeams.spitfire] }, () => {
    MarcAuthorities.searchBy(testData.authority.searchOption, testData.authority.title);
    MarcAuthorities.selectTitle(testData.authority.title);
    MarcAuthority.edit();
    MarcAuthority.checkAddNew001Tag(4, '$a test');
  });

  it('C353533 Protection of specified fields when editing "MARC Authority" record (spitfire)', { tags: [TestTypes.criticalPath, DevTeams.spitfire] }, () => {
    MarcAuthorities.searchBy(testData.authority.searchOption, testData.authority.title);
    MarcAuthorities.selectTitle(testData.authority.title);
    MarcAuthority.edit();
    MarcAuthority.checkInfoButton('999');
    newFieldsArr.forEach(field => {
      MarcAuthority.addNewField(10, field[0], field[3], field[1], field[2]);
    })
    QuickMarcEditor.pressSaveAndClose();

    protectedMARCFields.forEach(marcFieldProtectionRule => {
      MarcFieldProtection.createMarcFieldProtectionViaApi({
        indicator1: marcFieldProtectionRule[1],
        indicator2: marcFieldProtectionRule[2],
        subfield: marcFieldProtectionRule[3],
        data: marcFieldProtectionRule[4],
        source: 'USER',
        field: marcFieldProtectionRule[0]
      }).then((response) => {
        marcFieldProtectionRules.push(response.id);
      });
    });

    MarcAuthority.edit();
    MarcAuthority.checkInfoButton('655', 11);
    MarcAuthority.checkInfoButton('655', 14);
    MarcAuthority.checkInfoButton('245');
    MarcAuthority.checkInfoButton('520');
    MarcAuthority.checkInfoButton('999');
  });
});
