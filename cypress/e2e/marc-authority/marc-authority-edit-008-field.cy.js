import getRandomPostfix from '../../support/utils/stringTools';
import { DevTeams, Permissions, TestTypes } from '../../support/dictionary';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import MarcAuthorities from '../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../support/fragments/marcAuthority/marcAuthority';
import DataImport from '../../support/fragments/data_import/dataImport';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../support/fragments/data_import/logs/logs';

describe('Edit Authority record', () => {
  const testData = {
    authority: {
      title: 'Congress and foreign policy series',
      nonExactTitle: 'Congress',
      ldr: '00846cz\\\\a2200241n\\\\4500',
      searchOption: 'Uniform title',
      newField: {
        title: `Test authority ${getRandomPostfix()}`,
        tag: '901',
        content: 'venn',
      },
    },
  };
  const jobProfileToRun = 'Default - Create SRS MARC Authority';
  const marcFiles = [
    { marc: 'oneMarcAuthority.mrc', fileName: `testMarcFile.${getRandomPostfix()}.mrc` },
  ];
  const createdAuthorityID = [];

  before('Create test data', () => {
    cy.createTempUser([
      Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;
    });

    cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
      DataImport.uploadFile(marcFiles[0].marc, marcFiles[0].fileName);
      JobProfiles.waitLoadingList();
      JobProfiles.search(jobProfileToRun);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(marcFiles[0].fileName);
      Logs.checkStatusOfJobProfile('Completed');
      Logs.openFileDetails(marcFiles[0].fileName);
      Logs.getCreatedItemsID().then((link) => {
        createdAuthorityID.push(link.split('/')[5]);
      });
    });
  });

  before('Login', () => {
    cy.login(testData.userProperties.username, testData.userProperties.password, {
      path: TopMenu.marcAuthorities,
      waiter: MarcAuthorities.waitLoading,
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    createdAuthorityID.forEach((id) => {
      MarcAuthority.deleteViaAPI(id);
    });
    Users.deleteViaApi(testData.userProperties.userId);
  });

  it(
    'C350691 Update 008 field of MARC Authority record (spitfire) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.spitfire] },
    () => {
      MarcAuthorities.searchBy(testData.authority.searchOption, testData.authority.title);
      MarcAuthorities.select(createdAuthorityID[0]);
      MarcAuthority.edit();
      MarcAuthority.change008Field('x', 'x', 'x');
      MarcAuthority.clicksaveAndCloseButton();
      MarcAuthority.contains('xxx');
    },
  );
});
