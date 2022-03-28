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
import MarcAuthorityBrowse from '../../support/fragments/marcAuthority/MarcAuthorityBrowse';

describe('MARC Authority management', () => {
  let userId = '';

  beforeEach(() => {
    const fileName = `autotestFile.${getRandomPostfix()}.mrc`;

    // TODO: verify final set of permissions with PO
    cy.createTempUser([
      Permissions.uiTenantSettingsSettingsLocation.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
      Permissions.dataImportUploadAll.gui,
      Permissions.moduleDataImportEnabled.gui,
      Permissions.converterStorageAll.gui,
      Permissions.inventoryStorageAuthoritiesAll.gui
    ]).then(userProperties => {
      userId = userProperties.userId;
      cy.login(userProperties.username, userProperties.password);
      cy.visit(TopMenu.dataImportPath);

      DataImport.uploadFile(MarcAuthority.defaultAuthority.name, fileName);
      JobProfiles.waitLoadingList();
      JobProfiles.select(MarcAuthority.defaultJobProfile);
      JobProfiles.runImportFile(fileName);
      JobProfiles.openFileRecords(fileName);
      DataImport.getLinkToAuthority(MarcAuthority.defaultAuthority.headingReference).then(link => {
        const jobLogEntryId = link.split('/').at(-2);
        const recordId = link.split('/').at(-1);
        cy.intercept({
          method: 'GET',
          url: `/metadata-provider/jobLogEntries/${jobLogEntryId}/records/${recordId}`,
        }).as('getRecord');
        cy.visit(link);
        cy.wait('@getRecord', getLongDelay()).then(response => {
          const internalAuthorityId = response.response.body.relatedAuthorityInfo.idList[0];
          cy.visit(TopMenu.marcAuthorities);
          MarcAuthoritiesSearch.searchBy('Uniform title', MarcAuthority.defaultAuthority.headingReference);
          MarcAuthorities.select(internalAuthorityId);
          MarcAuthority.waitLoading();
        });
      });
    });
  });

  it('C350572 Edit an Authority record', { tags:  [TestTypes.smoke, Features.authority] }, () => {
    MarcAuthority.edit();
    QuickMarcEditor.waitLoading();

    const quickmarcEditor = new QuickMarcEditor(MarcAuthority.defaultAuthority);
    const updatedInSourceRow = quickmarcEditor.addNewField();
    const addedInSourceRow = quickmarcEditor.updateExistingField();
    QuickMarcEditor.pressSaveAndClose();
    MarcAuthority.waitLoading();
    MarcAuthority.contains(updatedInSourceRow);
    MarcAuthority.contains(addedInSourceRow);

    MarcAuthoritiesSearch.searchBy('Uniform title', addedInSourceRow);
    MarcAuthorities.checkRow(addedInSourceRow);
    MarcAuthorities.checkRowsCount(1);
  });

  it('C350575  MARC Authority fields LEADER and 008 can not be deleted', { tags:  [TestTypes.smoke, Features.authority] }, () => {
    MarcAuthority.edit();
    QuickMarcEditor.waitLoading();
    QuickMarcEditor.checkNotDeletableTags('008', 'LDR');
  });

  it('C350575  Update 008 of Authority record', { tags:  [TestTypes.smoke, Features.authority] }, () => {
    MarcAuthority.edit();
    QuickMarcEditor.waitLoading();

    const quickmarcEditor = new QuickMarcEditor(MarcAuthority.defaultAuthority);

    const changedValueInSourceRow = quickmarcEditor.updateAllDefaultValuesIn008TagInAuthority();
    MarcAuthority.waitLoading();
    MarcAuthority.contains(changedValueInSourceRow);
  });

  it('C350578 Browse existing Authorities', { tags:  [TestTypes.smoke, Features.authority] }, () => {
    // make one more import to get 2 marc authorities to check browse functionality
    const secondFileName = `autotestFile.${getRandomPostfix()}_second.mrc`;
    cy.visit(TopMenu.dataImportPath);

    DataImport.uploadFile(MarcAuthority.defaultAuthority.name, secondFileName);
    JobProfiles.waitLoadingList();
    JobProfiles.select(MarcAuthority.defaultJobProfile);
    JobProfiles.runImportFile(secondFileName);

    cy.visit(TopMenu.marcAuthorities);
    MarcAuthorities.switchToBrowse();
    MarcAuthorityBrowse.waitEmptyTable();
    MarcAuthorityBrowse.checkFiltersInitialState();
    MarcAuthorityBrowse.searchBy('Uniform title', MarcAuthority.defaultAuthority.headingReference);
    MarcAuthorityBrowse.waitLoading();
    MarcAuthorityBrowse.checkPresentedColumns();
  });

  afterEach(() => {
    cy.deleteUser(userId);
  });
});
