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
import dataImportSettingsActionProfiles from '../../support/fragments/settings/dataImport/dataImportSettingsActionProfiles';
import dataImportSettingsMatchProfiles from '../../support/fragments/settings/dataImport/dataImportSettingsMatchProfiles';
import dataImportSettingMappingProfiles from '../../support/fragments/settings/dataImport/dataImportSettingsMappingProfiles';
import dataImportSettingsJobProfiles from '../../support/fragments/settings/dataImport/dataImportSettingsJobProfiles';


let userId = '';
const marcAuthorityIds = new Set();


const importFile = (profileName) => {
  const uniqueFileName = `autotestFile.${getRandomPostfix()}.mrc`;
  cy.visit(TopMenu.dataImportPath);

  DataImport.uploadFile(MarcAuthority.defaultAuthority.name, uniqueFileName);
  JobProfiles.waitLoadingList();
  JobProfiles.select(profileName);
  JobProfiles.runImportFile(uniqueFileName);
  JobProfiles.openFileRecords(uniqueFileName);
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

      marcAuthorityIds.add(MarcAuthority.defaultAuthority.libraryOfCongressControlNumber);
      cy.visit(TopMenu.marcAuthorities);
      MarcAuthoritiesSearch.searchBy('Uniform title', MarcAuthority.defaultAuthority.headingReference);
      MarcAuthorities.select(internalAuthorityId);
      MarcAuthority.waitLoading();
    });
  });
};

describe('MARC Authority management', () => {
  beforeEach(() => {
    cy.createTempUser([
      Permissions.moduleDataImportEnabled.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      // TODO: clarify why TCs doesn't have this permission in precondition(C350666)
      Permissions.dataImportUploadAll.gui,
    ]).then(userProperties => {
      userId = userProperties.userId;
      cy.login(userProperties.username, userProperties.password);
      importFile(MarcAuthority.defaultCreateJobProfile);
    });
  });

  it('C350572 Edit an Authority record', { tags:  [TestTypes.smoke, Features.authority] }, () => {
    MarcAuthority.edit();
    QuickMarcEditor.waitLoading();

    const quickmarcEditor = new QuickMarcEditor(MarcAuthority.defaultAuthority);
    const addedInSourceRow = quickmarcEditor.addNewField();
    const updatedInSourceRow = quickmarcEditor.updateExistingField();
    QuickMarcEditor.pressSaveAndClose();
    MarcAuthority.waitLoading();
    MarcAuthority.contains(addedInSourceRow);
    MarcAuthority.contains(updatedInSourceRow);

    MarcAuthoritiesSearch.searchBy('Uniform title', updatedInSourceRow);
    MarcAuthorities.checkRow(updatedInSourceRow);
    MarcAuthorities.checkRowsCount(1);
  });

  it.only('C350667 Update a MARC authority record via data import. Record match with 010 $a', { tags:  [TestTypes.smoke, Features.authority] }, () => {
    // profiles preparing
    dataImportSettingMappingProfiles.createMappingProfileApi().then(mappingProfileResponse => {
      const specialActionProfile = { ...dataImportSettingsActionProfiles.marcAuthorityUpdateActionProfile };
      specialActionProfile.addedRelations[0].detailProfileId = mappingProfileResponse.body.id;
      dataImportSettingsActionProfiles.createActionProfileApi(specialActionProfile).then(actionProfileResponse => {
        dataImportSettingsMatchProfiles.createMatchProfileApi().then(matchProfileResponse => {
          const specialJobProfile = { ...dataImportSettingsJobProfiles.marcAuthorityUpdateJobProfile };
          specialJobProfile.addedRelations[0].detailProfileId = matchProfileResponse.body.id;
          specialJobProfile.addedRelations[1].masterProfileId = matchProfileResponse.body.id;
          specialJobProfile.addedRelations[1].detailProfileId = actionProfileResponse.body.id;

          dataImportSettingsJobProfiles.createJobProfileApi(specialJobProfile).then(jobProfileResponse => {
            MarcAuthority.edit();
            QuickMarcEditor.waitLoading();

            const quickmarcEditor = new QuickMarcEditor(MarcAuthority.defaultAuthority);
            const addedInSourceRow = quickmarcEditor.addNewField();
            const updatedInSourceRow = quickmarcEditor.updateExistingField();
            QuickMarcEditor.pressSaveAndClose();

            cy.visit(TopMenu.dataImportPath);

            importFile(jobProfileResponse.body.profile.name);
            MarcAuthority.notContains(addedInSourceRow);
            MarcAuthority.notContains(updatedInSourceRow);

            dataImportSettingsJobProfiles.deleteJobProfileApi(jobProfileResponse.body.id);

            dataImportSettingsMatchProfiles.deleteMatchProfileApi(matchProfileResponse.body.id);
            // unlink mpaang profile and action profile
            const linkedMappingProfile = { id: mappingProfileResponse.body.id,
              profile:{ ...dataImportSettingMappingProfiles.marcAuthorityUpdateMappingProfile } };
            linkedMappingProfile.profile.id = mappingProfileResponse.body.id;
            linkedMappingProfile.addedRelations = [];
            linkedMappingProfile.deletedRelations = [
              {
                'masterProfileId': actionProfileResponse.body.id,
                'masterProfileType': 'ACTION_PROFILE',
                'detailProfileId': mappingProfileResponse.body.id,
                'detailProfileType': 'MAPPING_PROFILE'
              }];

            dataImportSettingMappingProfiles.unlinkMappingProfileFromActionProfileApi(mappingProfileResponse.body.id, linkedMappingProfile);
            dataImportSettingMappingProfiles.deleteMappingProfileApi(mappingProfileResponse.body.id);
            dataImportSettingsActionProfiles.deleteActionProfileApi(actionProfileResponse.body.id);
          });
        });
      });
    });
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
    JobProfiles.select(MarcAuthority.defaulCretJobProfile);
    JobProfiles.runImportFile(secondFileName);

    cy.visit(TopMenu.marcAuthorities);
    MarcAuthorities.switchToBrowse();
    MarcAuthorityBrowse.waitEmptyTable();
    MarcAuthorityBrowse.checkFiltersInitialState();
    MarcAuthorityBrowse.searchBy('Uniform title', MarcAuthority.defaultAuthority.headingReference);
    MarcAuthorityBrowse.waitLoading();
    MarcAuthorityBrowse.checkPresentedColumns();
    // TODO: add checking of records order
  });

  afterEach(() => {
    marcAuthorityIds.forEach(marcAuthorityId => MarcAuthority.deleteViaAPI(marcAuthorityId));
    cy.deleteUser(userId);
  });
});
