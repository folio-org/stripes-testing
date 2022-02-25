import TestTypes from '../../support/dictionary/testTypes';
import Features from '../../support/dictionary/features';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import getRandomPostfix from '../../support/utils/stringTools';
import DataImport from '../../support/fragments/data_import/dataImport';
import MarcAuthority from '../../support/fragments/marcAuthority/marcAuthority';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import MarcAuthoritiesSearch from '../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthorities from '../../support/fragments/marcAuthority/marcAuthorities';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';
import { getLongDelay } from '../../support/utils/cypressTools';

describe('MARC Authority management', () => {
  let userId = '';
  const fileName = `autotestFile.${getRandomPostfix()}.mrc`;
  let internalAuthorityId;

  before(() => {
    cy.createTempUser([
      'View MARC authority record',
      'Edit MARC authority record',
      'Data Import File Upload - all permissions',
      'Data import: all permissions',
      'erm.jobs.manage',
      'Data Import Converter Storage - all permissions',
      'inventory storage module - all authorities permissions'
    ]).then(userProperties => {
      userId = userProperties.userId;
      cy.login(userProperties.username, userProperties.password);
      cy.visit(TopMenu.dataImportPath);

      DataImport.uploadFile(MarcAuthority.defaultMarcFile.name, fileName);
      JobProfiles.waitLoadingList();
      JobProfiles.select(MarcAuthority.defaultJobProfile);
      JobProfiles.runImportFile(fileName);
      JobProfiles.openFileRecords(fileName);
      DataImport.getLinkToAuthority(MarcAuthority.defaultMarcFile.headingReference).then(link => {
        const jobLogEntryId = link.split('/').at(-2);
        const recordId = link.split('/').at(-1);

        cy.intercept({
          method: 'GET',
          url: `/metadata-provider/jobLogEntries/${jobLogEntryId}/records/${recordId}`,
        }).as('getRecord');

        cy.wait('@getRecord', getLongDelay()).then(response => {
          internalAuthorityId = response.relatedAuthorityInfo.idList[0];
        });
      });
    });
  });


  it('C350572 Edit an Authority record', { tags:  [TestTypes.smoke, Features.authority] }, () => {
    cy.visit(TopMenu.marcAuthorities);
    MarcAuthoritiesSearch.searchBy('Uniform title', MarcAuthority.defaultMarcFile.headingReference);
    MarcAuthorities.select(MarcAuthority.defaultMarcFile.headingReference, internalAuthorityId);
    MarcAuthority.waitLoading();
    MarcAuthority.edit();
    QuickMarcEditor.waitLoading();
  });

  afterEach(() => {
    cy.deleteUser(userId);
  });
});
