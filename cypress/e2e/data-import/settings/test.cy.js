import getRandomPostfix from '../../../support/utils/stringTools';
import permissions from '../../../support/dictionary/permissions';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/z39.50TargetProfiles';
import MarcFieldProtection from '../../../support/fragments/settings/dataImport/marcFieldProtection';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryEditMarcRecord from '../../../support/fragments/inventory/inventoryEditMarcRecord';


describe('ui-data-import', () => {
  let user = null;
  let firstFieldId = null;
  let secondFieldId = null;
  const authentication = '100473910/PAOLF';
  const protectedFields = {
    firstField: '*',
    secondField: '920'
  };
  const oclcForImport = '830936944';
  // unique profile names
  const matchProfileName = `C356829 001 to Instance HRID ${getRandomPostfix()}`;
  const mappingProfileName = `C356829 Update instance and check field protections ${getRandomPostfix()}`;
  const actionProfileName = `C356829 Update instance and check field protections ${getRandomPostfix()}`;
  const jobProfileName = `C356829 Update instance and check field protections ${getRandomPostfix()}`;

  const matchProfile = {
    profileName: matchProfileName,
    incomingRecordFields: {
      field: '001'
    },
    matchCriterion: 'Exactly matches',
    existingRecordType: 'INSTANCE',
    instanceOption: NewMatchProfile.optionsList.instanceHrid
  };
  const mappingProfile = {
    name: mappingProfileName,
    typeValue: NewFieldMappingProfile.folioRecordTypeValue.instance,
    catalogedDate: '###TODAY###',
    instanceStatus: 'Batch Loaded'
  };
  const actionProfile = {
    typeValue: NewActionProfile.folioRecordTypeValue.instance,
    name: actionProfileName,
    action: 'Update (all record types except Orders, Invoices, or MARC Holdings)'
  };
  const jobProfile = {
    profileName: jobProfileName,
    acceptedType: NewJobProfile.acceptedDataType.marc
  };

  before(() => {
    cy.createTempUser([
      permissions.moduleDataImportEnabled.gui,
      permissions.settingsDataImportEnabled.gui,
      permissions.inventoryAll.gui,
      permissions.uiInventorySingleRecordImport.gui,
      permissions.uiInventoryViewCreateEditInstances.gui,
      permissions.uiInventorySettingsConfigureSingleRecordImport.gui,
      permissions.dataExportEnableApp.gui,
      permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui
    ])
      .then(userProperties => {
        user = userProperties;

        cy.login(user.username, user.password);
      });
  });

  it('C356829 Test field protections when importing to update instance, after editing the MARC Bib in quickMARC (folijet)',
    { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
      cy.visit(SettingsMenu.targetProfilesPath);
      Z3950TargetProfiles.openOclcWorldCat();
      Z3950TargetProfiles.editOclcWorldCat(authentication);
      Z3950TargetProfiles.checkIsOclcWorldCatIsChanged(authentication);

      MarcFieldProtection.createMarcFieldProtectionViaApi({
        indicator1: '*',
        indicator2: '*',
        subfield: '5',
        data: 'amb',
        source: 'USER',
        field: protectedFields.firstField
      })
        .then((resp) => {
          firstFieldId = resp.id;
        });
      MarcFieldProtection.createMarcFieldProtectionViaApi({
        indicator1: '*',
        indicator2: '*',
        subfield: '*',
        data: '*',
        source: 'USER',
        field: protectedFields.secondField
      })
        .then((resp) => {
          secondFieldId = resp.id;
        });

      // create match profile
      cy.visit(SettingsMenu.matchProfilePath);
      MatchProfiles.createMatchProfile(matchProfile);
      MatchProfiles.checkMatchProfilePresented(matchProfileName);

      // create mapping profile
      cy.visit(SettingsMenu.mappingProfilePath);
      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
      NewFieldMappingProfile.fillCatalogedDate(mappingProfile.catalogedDate);
      NewFieldMappingProfile.fillInstanceStatusTerm(mappingProfile.statusTerm);
      FieldMappingProfiles.saveProfile();
      FieldMappingProfiles.closeViewModeForMappingProfile(mappingProfileName);
      FieldMappingProfiles.checkMappingProfilePresented(mappingProfileName);

      // create action profile
      cy.visit(SettingsMenu.actionProfilePath);
      ActionProfiles.create(actionProfile, mappingProfileName);
      ActionProfiles.checkActionProfilePresented(actionProfileName);

      // create job profile
      cy.visit(SettingsMenu.jobProfilePath);
      JobProfiles.createJobProfile(jobProfile);
      NewJobProfile.linkMatchAndActionProfilesForInstance(actionProfileName, matchProfileName);
      NewJobProfile.saveAndClose();
      JobProfiles.checkJobProfilePresented(jobProfileName);

      cy.visit(TopMenu.inventoryPath);
      InventoryInstances.importWithOclc(oclcForImport);
      InventoryInstance.editMarcBibliographicRecord();
      InventoryEditMarcRecord.deleteField();
      InventoryEditMarcRecord.addField('920', 'This should be a protected field');
    });
});
