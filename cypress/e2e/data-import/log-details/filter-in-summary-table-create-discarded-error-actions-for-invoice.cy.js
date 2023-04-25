import getRandomPostfix from '../../../support/utils/stringTools';
import permissions from '../../../support/dictionary/permissions';
import DevTeams from '../../../support/dictionary/devTeams';
import TestTypes from '../../../support/dictionary/testTypes';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';

import DataImport from '../../../support/fragments/data_import/dataImport';
import TopMenu from '../../../support/fragments/topMenu';
import LogsViewAll from '../../../support/fragments/data_import/logs/logsViewAll';
import Logs from '../../../support/fragments/data_import/logs/logs';
import Users from '../../../support/fragments/users/users';

describe('ui-data-import', () => {
  let user;
  const profileForDuplicate = FieldMappingProfiles.mappingProfileForDuplicate.ebsco;
  const marcFileName = `C357018 autotest file ${getRandomPostfix()}`;
  const mappingProfile = {
    name:`C357018 Test invoice log table Create EBSCO invoice ${getRandomPostfix()}`,
    incomingRecordType:NewFieldMappingProfile.incomingRecordType.edifact,
    existingRecordType:NewFieldMappingProfile.folioRecordTypeValue.invoice,
    description:'',
    batchGroup: '"Amherst (AC)"',
    organizationName: NewFieldMappingProfile.organization.ebsco,
    paymentMethod: '"Credit Card"'
  };
  const actionProfile = {
    name: `C357018 Test invoice log table ${getRandomPostfix()}`,
    typeValue: 'Invoice',
  };
  const jobProfile = {
    ...NewJobProfile.defaultJobProfile,
    profileName: `autoTestJobProf.${getRandomPostfix()}`,
    acceptedType: NewJobProfile.acceptedDataType.edifact
  };

  before(() => {
    cy.createTempUser([
      permissions.moduleDataImportEnabled.gui,
      permissions.settingsDataImportEnabled.gui,
      permissions.uiOrganizationsViewEditCreate.gui
    ])
      .then(userProperties => {
        user = userProperties;

        cy.login(userProperties.username, userProperties.password,
          { path: SettingsMenu.mappingProfilePath, waiter: FieldMappingProfiles.waitLoading });
      });
  });

  it('C357018 Check the filter in summary table with "create + discarded + error" actions for the Invoice column (folijet)',
    { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
      // create Field mapping profile
      FieldMappingProfiles.waitLoading();
      FieldMappingProfiles.createInvoiceMappingProfile(mappingProfile, profileForDuplicate);
      FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);

      // create Action profile and link it to Field mapping profile
      cy.visit(SettingsMenu.actionProfilePath);
      ActionProfiles.create(actionProfile, mappingProfile.name);
      ActionProfiles.checkActionProfilePresented(actionProfile.name);

      // create Job profile
      cy.visit(SettingsMenu.jobProfilePath);
      JobProfiles.createJobProfile(jobProfile);
      NewJobProfile.linkActionProfile(actionProfile);
      NewJobProfile.saveAndClose();
      JobProfiles.checkJobProfilePresented(jobProfile.profileName);

      cy.visit(TopMenu.dataImportPath);
      // TODO delete reload after fix https://issues.folio.org/browse/MODDATAIMP-691
      cy.reload();
      DataImport.uploadFile('ediFileForC357018.edi', marcFileName);
      JobProfiles.searchJobProfileForImport(jobProfile.profileName);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(marcFileName);
      Logs.checkStatusOfJobProfile('Completed with errors');
      Logs.openFileDetails(marcFileName);

      
    });
});
