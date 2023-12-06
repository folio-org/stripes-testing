import Permissions from '../../../../support/dictionary/permissions';
// import DataImport from '../../../../support/fragments/data_import/dataImport';
// import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
// import Logs from '../../../../support/fragments/data_import/logs/logs';
// import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
// import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
// import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
// import MarcFieldProtection from '../../../../support/fragments/settings/dataImport/marcFieldProtection';
// import TopMenu from '../../../../support/fragments/topMenu';
// import Users from '../../../../support/fragments/users/users';
// import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC -> MARC Authority -> Edit Authority record', () => {
  const testData = {
    createdAuthorityID: [],
  };
  // const marcFiles = [
  //   {
  //     marc: 'marcBibFileC376936.mrc',
  //     fileName: `C376936 testMarcFile${getRandomPostfix()}.mrc`,
  //     jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
  //   },
  //   {
  //     marc: 'marcAuthFileC376936.mrc',
  //     fileName: `C376936 testMarcFile${getRandomPostfix()}.mrc`,
  //     jobProfileToRun: 'Default - Create SRS MARC Authority',
  //     // authorityHeading: 'C375994 Robinson, Peter, 1950-2022 Alt. title',
  //     // authority001FieldValue: '30520443759941',
  //   },
  // ];
  // const linkingTagAndValue = {
  //   rowIndex: 18,
  //   value: 'C376936 Roberts, Julia',
  //   tag: '700',
  // };

  before('Create test data', () => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
      Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;
    });
  });

  it(
    'C376936 Verify that user can not delete value from "$a" subfield of "010" field in linked "MARC Authority" record when "010" = "$0" (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {},
  );
});
