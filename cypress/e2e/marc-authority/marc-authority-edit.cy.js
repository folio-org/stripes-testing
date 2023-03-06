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
import { replaceByIndex } from '../../support/utils/stringTools';

describe('MARC Authority -> Edit Authority record', () => {
  const testData = {
    authority: {
      title: 'Twain, Mark, 1835-1910. Adventures of Huckleberry Finn',
      searchOption: 'Keyword',
    },
    authorityB: {
      title: 'Beethoven, Ludwig van (no 010)',
      searchOption: 'Keyword',
    }
  };
  const jobProfileToRun = 'Default - Create SRS MARC Authority';
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
  const initialLDRValue = String.raw`04112cz\\a2200589n\\4500`;
  const changesSavedCallout = 'Record has been updated.';
  const changedLDRs = [
    { newContent: replaceByIndex(replaceByIndex(replaceByIndex(initialLDRValue, 5, 'a'), 17, 'n'), 18, '\\') },
    { newContent: replaceByIndex(replaceByIndex(replaceByIndex(initialLDRValue, 5, 'c'), 17, 'o'), 18, ' ') },
    { newContent: replaceByIndex(replaceByIndex(replaceByIndex(initialLDRValue, 5, 'd'), 17, 'n'), 18, 'c') },
    { newContent: replaceByIndex(replaceByIndex(replaceByIndex(initialLDRValue, 5, 'n'), 17, 'o'), 18, 'i') },
    { newContent: replaceByIndex(replaceByIndex(replaceByIndex(initialLDRValue, 5, 'o'), 17, 'n'), 18, 'u') },
    { newContent: replaceByIndex(replaceByIndex(replaceByIndex(initialLDRValue, 5, 's'), 17, 'o'), 18, 'c') },
    { newContent: replaceByIndex(replaceByIndex(replaceByIndex(initialLDRValue, 5, 'x'), 17, 'n'), 18, 'i') },
  ];
  const marcFiles = [
    {marc: 'marcFileForC350901.mrc', fileName: `testMarcFile.${getRandomPostfix()}.mrc`}, 
    {marc: 'marcFileForC375141.mrc', fileName: `testMarcFile.${getRandomPostfix()}.mrc`}
  ]
  const marcFieldProtectionRules = [];
  let createdAuthorityID = [];

  before('', () => {
    cy.createTempUser([
      Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
    ]).then(createdUserProperties => {
      testData.userProperties = createdUserProperties;
    });

    marcFiles.forEach(marcFile => {
      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
        DataImport.uploadFile(marcFile.marc, marcFile.fileName);
        JobProfiles.waitLoadingList();
        JobProfiles.searchJobProfileForImport(jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFile.fileName);
        Logs.checkStatusOfJobProfile('Completed');
        Logs.openFileDetails(marcFile.fileName);
        Logs.getCreatedItemsID().then(link => {
          createdAuthorityID.push(link.split('/')[5]);
        });
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

    createdAuthorityID.forEach(id => { MarcAuthority.deleteViaAPI(id); });
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

  it('C353583 Verify LDR validation rules with valid data (spitfire)', { tags: [TestTypes.criticalPath, DevTeams.spitfire] }, () => {
    MarcAuthorities.searchBy(testData.authority.searchOption, testData.authority.title);
    MarcAuthorities.selectTitle(testData.authority.title);
    changedLDRs.forEach(changeLDR => {
      MarcAuthority.edit();
      QuickMarcEditor.updateExistingField('LDR', changeLDR.newContent);
      QuickMarcEditor.pressSaveAndClose();
      (changeLDR.newContent === String.raw`04112az\\a2200589n\\4500`) 
      ? 
      MarcAuthorities.verifyFirstValueSaveSuccess(changesSavedCallout, changeLDR.newContent) 
      : 
      MarcAuthorities.verifySaveSuccess(changesSavedCallout, changeLDR.newContent);
    });    
  });

  it('C356840 Verify that the "Save & close" button enabled when user make changes in the record. (spitfire)', { tags: [TestTypes.criticalPath, DevTeams.spitfire] }, () => {
    MarcAuthorities.searchBy(testData.authority.searchOption, testData.authority.title);
    MarcAuthorities.selectTitle(testData.authority.title);
    MarcAuthority.edit();
    MarcAuthority.addNewField(7, '555', '$a test');
    QuickMarcEditor.checkButtonSaveAndCloseEnable();
    MarcAuthority.addNewField(7, '555', '$a test');
    QuickMarcEditor.checkButtonSaveAndCloseEnable();
    MarcAuthority.addNewField(7, '555', '$a test');
    QuickMarcEditor.checkButtonSaveAndCloseEnable();
    MarcAuthority.deleteTag(8);
    QuickMarcEditor.checkButtonSaveAndCloseEnable();
    MarcAuthority.deleteTag(8);
    QuickMarcEditor.checkButtonSaveAndCloseEnable();
    MarcAuthority.deleteTag(8);
    MarcAuthority.deleteTag(8);
    QuickMarcEditor.pressSaveAndClose();
    QuickMarcEditor.confirmDelete();
    MarcAuthorities.waitLoading();
  });

  it('C375141 Add/edit/delete "010" field of "MARC authority" record not linked to a "MARC bibliographic" record (spitfire)', { tags: [TestTypes.criticalPath, DevTeams.spitfire] }, () => {
    MarcAuthorities.searchAndVerify(testData.authorityB.searchOption, testData.authorityB.title);
    MarcAuthority.edit();
    MarcAuthorities.check010FieldAbsence();
    MarcAuthority.addNewField(4, '010', '$a 123123');
    QuickMarcEditor.checkButtonsEnabled();
    QuickMarcEditor.clickSaveAndKeepEditing();
    QuickMarcEditor.updateExistingField('010', '$a n90635366');
    QuickMarcEditor.checkButtonsEnabled();
    QuickMarcEditor.clickSaveAndKeepEditing();
    // wait until all the saved and updated values will be loaded.
    cy.wait(3000);
    QuickMarcEditor.deleteFieldAndCheck(5, '010');
    QuickMarcEditor.checkButtonsEnabled();
    QuickMarcEditor.pressSaveAndClose();
    QuickMarcEditor.verifyConfirmModal();
    QuickMarcEditor.constinueWithSaveAndCheck();
  });
});
