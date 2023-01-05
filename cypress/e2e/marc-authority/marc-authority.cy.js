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
import SettingsActionProfiles from '../../support/fragments/settings/dataImport/settingsActionProfiles';
import SettingsMatchProfiles from '../../support/fragments/settings/dataImport/settingsMatchProfiles';
import SettingMappingProfiles from '../../support/fragments/settings/dataImport/settingsMappingProfiles';
import SettingsJobProfiles from '../../support/fragments/settings/dataImport/settingsJobProfiles';
import Users from '../../support/fragments/users/users';
import { Callout } from '../../../interactors';
import DevTeams from '../../support/dictionary/devTeams';

describe('MARC Authority management', () => {
  const userProperties = { name: 'testname' };
  let marcAuthorityIds = [];

  const importFile = (profileName) => {
    const uniqueFileName = `autotestFile.${getRandomPostfix()}.mrc`;
    cy.visit(TopMenu.dataImportPath);

    DataImport.uploadFile(MarcAuthority.defaultAuthority.name, uniqueFileName);
    JobProfiles.waitLoadingList();
    JobProfiles.select(profileName);
    JobProfiles.runImportFile();
    JobProfiles.waitFileIsImported(uniqueFileName);
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
    ]).then(createdUserProperties => {
      userProperties.id = createdUserProperties.userId;
      userProperties.firstName = createdUserProperties.firstName;
      userProperties.name = createdUserProperties.username;

      cy.login(createdUserProperties.username, createdUserProperties.password);
      importFile(MarcAuthority.defaultCreateJobProfile);
    });
  });

  it('C350572 Edit an Authority record (spitfire)', { tags: [TestTypes.smoke, DevTeams.spitfire, Features.authority] }, () => {
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

  it('C350667 Update a MARC authority record via data import. Record match with 010 $a (spitfire)', { tags: [TestTypes.smoke, DevTeams.spitfire, Features.authority] }, () => {
    // profiles preparing
    SettingMappingProfiles.createMappingProfileApi().then(mappingProfileResponse => {
      const specialActionProfile = { ...SettingsActionProfiles.marcAuthorityUpdateActionProfile };
      specialActionProfile.addedRelations[0].detailProfileId = mappingProfileResponse.body.id;
      SettingsActionProfiles.createActionProfileApi(specialActionProfile).then(actionProfileResponse => {
        SettingsMatchProfiles.createMatchProfileApi().then(matchProfileResponse => {
          const specialJobProfile = { ...SettingsJobProfiles.marcAuthorityUpdateJobProfile };
          specialJobProfile.addedRelations[0].detailProfileId = matchProfileResponse.body.id;
          specialJobProfile.addedRelations[1].masterProfileId = matchProfileResponse.body.id;
          specialJobProfile.addedRelations[1].detailProfileId = actionProfileResponse.body.id;
          SettingsJobProfiles.createJobProfileApi(specialJobProfile).then(jobProfileResponse => {
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

            SettingsJobProfiles.deleteJobProfileApi(jobProfileResponse.body.id);
            SettingsMatchProfiles.deleteMatchProfileApi(matchProfileResponse.body.id);
            // unlink mapping profile and action profile
            const linkedMappingProfile = {
              id: mappingProfileResponse.body.id,
              profile: { ...SettingMappingProfiles.marcAuthorityUpdateMappingProfile.profile }
            };
            linkedMappingProfile.profile.id = mappingProfileResponse.body.id;
            linkedMappingProfile.addedRelations = [];
            linkedMappingProfile.deletedRelations = [
              {
                'masterProfileId': actionProfileResponse.body.id,
                'masterProfileType': 'ACTION_PROFILE',
                'detailProfileId': mappingProfileResponse.body.id,
                'detailProfileType': 'MAPPING_PROFILE'
              }];

            SettingMappingProfiles.unlinkMappingProfileFromActionProfileApi(mappingProfileResponse.body.id, linkedMappingProfile);

            SettingMappingProfiles.deleteMappingProfileApi(mappingProfileResponse.body.id);
            SettingsActionProfiles.deleteActionProfileApi(actionProfileResponse.body.id);
          });
        });
      });
    });
  });

  it('C350575  MARC Authority fields LEADER and 008 can not be deleted (spitfire)', { tags: [TestTypes.smoke, DevTeams.spitfire, Features.authority, TestTypes.broken] }, () => {
    MarcAuthority.edit();
    QuickMarcEditor.waitLoading();
    QuickMarcEditor.checkNotDeletableTags('008', 'LDR');
  });

  it('C350576 Update 008 of Authority record (spitfire)', { tags: [TestTypes.smoke, DevTeams.spitfire, Features.authority, TestTypes.broken] }, () => {
    MarcAuthority.edit();
    QuickMarcEditor.waitLoading();

    const quickmarcEditor = new QuickMarcEditor(MarcAuthority.defaultAuthority);

    const changedValueInSourceRow = quickmarcEditor.updateAllDefaultValuesIn008TagInAuthority();
    MarcAuthority.waitLoading();
    MarcAuthority.contains(changedValueInSourceRow);
  });

  it('C350578 Browse existing Authorities (spitfire)', { tags: [TestTypes.smoke, DevTeams.spitfire, Features.authority] }, () => {
    // make one more import to get 2 marc authorities to check browse functionality
    const secondFileName = `autotestFile.${getRandomPostfix()}_second.mrc`;
    cy.visit(TopMenu.dataImportPath);

    DataImport.uploadFile(MarcAuthority.defaultAuthority.name, secondFileName);
    JobProfiles.waitLoadingList();
    JobProfiles.select(MarcAuthority.defaultCreateJobProfile);
    JobProfiles.runImportFile();
    JobProfiles.waitFileIsImported(secondFileName);

    cy.visit(TopMenu.marcAuthorities);
    MarcAuthorities.switchToBrowse();
    MarcAuthorityBrowse.waitEmptyTable();
    MarcAuthorityBrowse.checkFiltersInitialState();
    MarcAuthorityBrowse.searchBy(MarcAuthorityBrowse.searchOptions.uniformTitle.option, MarcAuthority.defaultAuthority.headingReference);
    MarcAuthorityBrowse.waitLoading();
    MarcAuthorityBrowse.checkPresentedColumns();
  });

  it('C350513 Browse authority - handling for when there is no exact match (spitfire)', { tags: [TestTypes.smoke, DevTeams.spitfire, Features.authority, TestTypes.broken] }, () => {
    // update created marc authority
    MarcAuthority.edit();
    QuickMarcEditor.waitLoading();

    const quickmarcEditor = new QuickMarcEditor(MarcAuthority.defaultAuthority);
    // 0 added at the beginning to generate data into the first lines of result of searching into Marc Authority Browse
    const randomPrefix = `0${getRandomPostfix()}`;
    // postfixes A and B added to check lines ordering
    quickmarcEditor.updateExistingField('130', `${randomPrefix} A`);
    QuickMarcEditor.pressSaveAndClose();
    MarcAuthority.waitLoading();

    importFile(MarcAuthority.defaultCreateJobProfile);
    MarcAuthority.edit();
    QuickMarcEditor.waitLoading();

    quickmarcEditor.updateExistingField('130', `${randomPrefix} B`);
    QuickMarcEditor.pressSaveAndClose();
    MarcAuthority.waitLoading();

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

  it('C350902 MARC fields behavior when editing "MARC Authority" record (spitfire)', { tags: [TestTypes.smoke, DevTeams.spitfire, Features.authority] }, () => {
    MarcAuthority.edit();
    QuickMarcEditor.waitLoading();
    const quickmarcEditor = new QuickMarcEditor(MarcAuthority.defaultAuthority);
    quickmarcEditor.checkHeaderFirstLine(MarcAuthority.defaultAuthority, userProperties);
    QuickMarcEditor.checkReadOnlyTags();
    quickmarcEditor.checkLDRValue();
    quickmarcEditor.checkAuthority008SubfieldsLength();
    quickmarcEditor.updateExistingTagName({ newTagName: MarcAuthority.defaultAuthority.existingTag.slice(0, -1) });
    QuickMarcEditor.pressSaveAndClose();
    const errorMessage = Callout('Record cannot be saved. A MARC tag must contain three characters.');
    cy.expect(errorMessage.exists());
    cy.do(errorMessage.dismiss());
    QuickMarcEditor.waitLoading();
  });

  afterEach(() => {
    new Set(marcAuthorityIds).forEach(marcAuthorityId => MarcAuthority.deleteViaAPI(marcAuthorityId));
    marcAuthorityIds = [];
    Users.deleteViaApi(userProperties.id);
  });
});
