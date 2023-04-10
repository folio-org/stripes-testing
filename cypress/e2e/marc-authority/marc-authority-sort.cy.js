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

describe('MARC Authority Sort', () => {
  const testData = {
    authority: {
      title: 'Type of heading test',
      searchOption: 'Keyword',
    }
  };
  const jobProfileToRun = 'Default - Create SRS MARC Authority';
  const marcFile = {
    marc: 'marcFileForC350579.mrc', fileName: `testMarcFile.${getRandomPostfix()}.mrc`
  }

  let createdAuthorityID = [];

  const headingTypes = ['Corporate Name', 'Personal Name'];
  const marcAuthorities = {
    authorizedReferences: ['Authorized', 'Authorized', 'Reference'],
    headingReferences: ['Type of heading test a', 'Type of heading test b', 'Type of heading test c'],
    typeOfHeadings: ['Corporate Name', 'Corporate Name', 'Personal Name'],
  }

  before(() => {
    cy.createTempUser([
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui
    ]).then(createdUserProperties => {
      testData.userProperties = createdUserProperties;
    });

    cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
      DataImport.uploadFile(marcFile.marc, marcFile.fileName);
      JobProfiles.waitLoadingList();
      JobProfiles.searchJobProfileForImport(jobProfileToRun);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(marcFile.fileName);
      Logs.checkStatusOfJobProfile('Completed');
      Logs.openFileDetails(marcFile.fileName);
      for (let i = 0; i < 2; i++) {
        Logs.getCreatedItemsID(i).then(link => {
          createdAuthorityID.push(link.split('/')[5]);
        });
      };
    });
  });

  beforeEach(() => {
    cy.login(testData.userProperties.username, testData.userProperties.password, { path: TopMenu.marcAuthorities, waiter: MarcAuthorities.waitLoading });
  });

  after(() => {
    cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
    DataImport.selectLog();
    DataImport.openDeleteImportLogsModal();
    DataImport.confirmDeleteImportLogs();

    createdAuthorityID.forEach(id => { MarcAuthority.deleteViaAPI(id); });
    Users.deleteViaApi(testData.userProperties.userId);
  });

  it('C350579 Sorting and displaying results of search authority records by "Actions" dropdown menu (spitfire)', { tags: [TestTypes.criticalPath, DevTeams.spitfire] }, () => {
    MarcAuthorities.searchBy(testData.authority.searchOption, testData.authority.title);
    MarcAuthorities.chooseTypeOfHeading(headingTypes);

    MarcAuthorities.clickActionsButton();
    MarcAuthorities.actionsSortBy('Authorized/Reference');
    MarcAuthorities.checkRowsContent(marcAuthorities.authorizedReferences);
    MarcAuthorities.actionsSortBy('Heading/Reference');
    MarcAuthorities.checkRowsContent(marcAuthorities.headingReferences);
    MarcAuthorities.actionsSortBy('Type of heading');
    MarcAuthorities.checkRowsContent(marcAuthorities.typeOfHeadings);

    MarcAuthorities.actionsSelectCheckbox('Authorized/Reference');
    MarcAuthorities.checkColumnAbsent('Authorized/Reference');
    MarcAuthorities.actionsSelectCheckbox('Type of heading');
    MarcAuthorities.checkColumnAbsent('Type of heading');
    MarcAuthorities.actionsSelectCheckbox('Number of titles');
    MarcAuthorities.checkColumnAbsent('Number of titles');

    MarcAuthorities.actionsSelectCheckbox('Authorized/Reference');
    MarcAuthorities.actionsSelectCheckbox('Type of heading');
    MarcAuthorities.actionsSelectCheckbox('Number of titles');
    MarcAuthorities.checkColumnExists('Authorized/Reference');
    MarcAuthorities.checkColumnExists('Type of heading');
    MarcAuthorities.checkColumnExists('Number of titles');

    MarcAuthorities.clickResetAndCheck(testData.authority.searchOption);
  });
});
