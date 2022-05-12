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

describe('MARC Authority management', () => {
  let userId = '';
  let marcAuthorityIds = [];

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

        marcAuthorityIds.push(internalAuthorityId);
        cy.visit(TopMenu.marcAuthorities);
        MarcAuthoritiesSearch.searchBy('Uniform title', MarcAuthority.defaultAuthority.headingReference);
        MarcAuthorities.select(internalAuthorityId);
        MarcAuthority.waitLoading();
      });
    });
  };

  beforeEach(() => {
    cy.createTempUser([
      Permissions.settingsDataImportEnabled.gui,
      Permissions.moduleDataImportEnabled.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui
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

  // https://issues.folio.org/browse/UIMARCAUTH-131
  it('C350667 Update a MARC authority record via data import. Record match with 010 $a', { tags:  [TestTypes.smoke, Features.authority] }, () => {
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
            // unlink mapping profile and action profile
            const linkedMappingProfile = { id: mappingProfileResponse.body.id,
              profile:{ ...dataImportSettingMappingProfiles.marcAuthorityUpdateMappingProfile.profile } };
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

  it('C350576 Update 008 of Authority record', { tags:  [TestTypes.smoke, Features.authority] }, () => {
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
    JobProfiles.select(MarcAuthority.defaultCreateJobProfile);
    JobProfiles.runImportFile(secondFileName);

    cy.visit(TopMenu.marcAuthorities);
    MarcAuthorities.switchToBrowse();
    MarcAuthorityBrowse.waitEmptyTable();
    MarcAuthorityBrowse.checkFiltersInitialState();
    MarcAuthorityBrowse.searchBy(MarcAuthorityBrowse.searchOptions.uniformTitle.option, MarcAuthority.defaultAuthority.headingReference);
    MarcAuthorityBrowse.waitLoading();
    MarcAuthorityBrowse.checkPresentedColumns();
  });

  it('C350513 Browse authority - handling for when there is no exact match', { tags:  [TestTypes.smoke, Features.authority] }, () => {
    // update created marc authority
    MarcAuthority.edit();
    QuickMarcEditor.waitLoading();

    const quickmarcEditor = new QuickMarcEditor(MarcAuthority.defaultAuthority);
    // 0 added at the beginning to generate data into the first lines of result of searching into Marc Authority Browse
    const randomPrefix = `0${getRandomPostfix()}`;
    // postfixes A and B added to check lines ordering
    quickmarcEditor.updateExistingField('130', `${randomPrefix} A`);
    QuickMarcEditor.pressSaveAndClose();

    importFile(MarcAuthority.defaultCreateJobProfile);
    MarcAuthority.edit();
    QuickMarcEditor.waitLoading();

    quickmarcEditor.updateExistingField('130', `${randomPrefix} B`);
    QuickMarcEditor.pressSaveAndClose();

    MarcAuthorities.switchToBrowse();
    MarcAuthorityBrowse.waitEmptyTable();
    MarcAuthorityBrowse.checkSearchOptions();
    MarcAuthorityBrowse.searchBy(MarcAuthorityBrowse.searchOptions.uniformTitle.option, randomPrefix);
    MarcAuthorityBrowse.checkSelectedSearchOption(MarcAuthorityBrowse.searchOptions.uniformTitle);
    MarcAuthorityBrowse.waitLoading();

    MarcAuthorityBrowse.checkHeadingReferenceInRow(0, MarcAuthorityBrowse.getNotExistingHeadingReferenceValue(randomPrefix), false);
    MarcAuthorityBrowse.checkHeadingReferenceInRow(1, `${randomPrefix} A`, true);
    MarcAuthorityBrowse.checkHeadingReferenceInRow(2, `${randomPrefix} B`, true);
  });

  afterEach(() => {
    // https://issues.folio.org/browse/FAT-1680
    new Set(marcAuthorityIds).forEach(marcAuthorityId => MarcAuthority.deleteViaAPI(marcAuthorityId));
    marcAuthorityIds = [];
    cy.deleteUser(userId);
  });
});
